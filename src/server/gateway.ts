// Payment gateway abstraction.
//
// - Default provider is 'mock' (the built-in simulated gateway) which requires
//   no configuration and works in any environment (including the Electron desktop
//   build and localhost dev).
// - 'zarinpal' and 'idpay' integrate real Iranian gateways via their REST APIs.
//   They need API keys (env vars) AND a publicly reachable callback URL, so the
//   portal must be hosted. The desktop management app cannot receive gateway
//   callbacks, so real gateways require a hosted deployment (set PORTAL_PUBLIC_URL).
//
// Amounts are kept internally in Toman; Zarinpal/IDPay expect Rial, so we x10.

export type GatewayKind = 'mock' | 'zarinpal' | 'idpay';

export function getGateway(): GatewayKind {
  const g = (process.env.PAYMENT_GATEWAY || 'mock').toLowerCase();
  if (g === 'zarinpal' || g === 'idpay') return g;
  return 'mock';
}

export type PaymentRequest = {
  amountToman: number; // internal amount (Toman)
  callbackUrl: string; // absolute callback URL (use PORTAL_PUBLIC_URL in prod)
  description: string;
  mobile?: string;
  email?: string;
  orderId: string; // local unique id, also used as the mock authority
  returnUrl?: string; // where to send the payer after the gateway redirects back
};

export type PaymentStart = {
  ok: boolean;
  provider: GatewayKind;
  authority: string; // gateway authority (or local id for mock)
  url?: string; // where to redirect the payer
  error?: string;
};

export type VerifyRequest = {
  authority: string;
  amountToman: number;
};

export type VerifyResult = {
  ok: boolean;
  provider: GatewayKind;
  refId?: string;
  cardPan?: string;
  error?: string;
};

function boolEnv(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined) return fallback;
  return v === 'true' || v === '1';
}

// ----------------------------- MOCK -----------------------------
function startMock(req: PaymentRequest): PaymentStart {
  let cb = '/api/payments/callback';
  if (req.returnUrl) cb += `?returnUrl=${encodeURIComponent(req.returnUrl)}`;
  const url = `/gateway/mock/pay?authority=${encodeURIComponent(req.orderId)}&amount=${req.amountToman}&cb=${encodeURIComponent(cb)}`;
  return { ok: true, provider: 'mock', authority: req.orderId, url };
}

// --------------------------- ZARINPAL ---------------------------
async function startZarinpal(req: PaymentRequest): Promise<PaymentStart> {
  const merchant = process.env.ZARINPAL_MERCHANT_ID;
  if (!merchant) return { ok: false, provider: 'zarinpal', authority: '', error: 'ZARINPAL_MERCHANT_ID تنظیم نشده است' };
  const sandbox = boolEnv('ZARINPAL_SANDBOX', true);
  const base = sandbox
    ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
    : 'https://api.zarinpal.com/pg/v4/payment/request.json';
  const amountRial = req.amountToman * 10;
  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: merchant,
        amount: amountRial,
        callback_url: req.callbackUrl,
        description: req.description,
        metadata: { mobile: req.mobile || undefined, email: req.email || undefined },
      }),
    });
    const data = await res.json();
    if (data?.data?.code === 100 && data?.data?.authority) {
      const authority = String(data.data.authority);
      const payUrl = sandbox
        ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
        : `https://www.zarinpal.com/pg/StartPay/${authority}`;
      return { ok: true, provider: 'zarinpal', authority, url: payUrl };
    }
    return { ok: false, provider: 'zarinpal', authority: '', error: data?.errors?.message || 'درخواست زرین‌پال ناموفق بود' };
  } catch (e: any) {
    return { ok: false, provider: 'zarinpal', authority: '', error: `خطا در ارتباط با زرین‌پال: ${e?.message || e}` };
  }
}

async function verifyZarinpal(authority: string, amountToman: number, merchant: string, sandbox: boolean): Promise<VerifyResult> {
  const base = sandbox
    ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
    : 'https://api.zarinpal.com/pg/v4/payment/verify.json';
  const amountRial = amountToman * 10;
  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant_id: merchant, amount: amountRial, authority }),
    });
    const data = await res.json();
    if (data?.data?.code === 100) {
      return { ok: true, provider: 'zarinpal', refId: String(data.data.ref_id), cardPan: data.data.card_pan || '' };
    }
    return { ok: false, provider: 'zarinpal', error: data?.errors?.message || 'تأیید پرداخت زرین‌پال ناموفق بود' };
  } catch (e: any) {
    return { ok: false, provider: 'zarinpal', error: `خطا در تأیید زرین‌پال: ${e?.message || e}` };
  }
}

// ----------------------------- IDPAY ----------------------------
async function startIdpay(req: PaymentRequest): Promise<PaymentStart> {
  const apiKey = process.env.IDPAY_API_KEY;
  if (!apiKey) return { ok: false, provider: 'idpay', authority: '', error: 'IDPAY_API_KEY تنظیم نشده است' };
  const sandbox = boolEnv('IDPAY_SANDBOX', true);
  const base = 'https://api.idpay.ir/v1.1/payment';
  const amountRial = req.amountToman * 10;
  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
        'X-SANDBOX': sandbox ? '1' : '0',
      },
      body: JSON.stringify({
        order_id: req.orderId,
        amount: amountRial,
        callback: req.callbackUrl,
        desc: req.description,
        mobile: req.mobile || undefined,
        mail: req.email || undefined,
      }),
    });
    const data = await res.json();
    if (data?.id && data?.link) {
      return { ok: true, provider: 'idpay', authority: String(data.id), url: data.link };
    }
    return { ok: false, provider: 'idpay', authority: '', error: data?.error_message || `کد ${data?.errorCode || '?'}` || 'درخواست آیدی‌پی ناموفق بود' };
  } catch (e: any) {
    return { ok: false, provider: 'idpay', authority: '', error: `خطا در ارتباط با آیدی‌پی: ${e?.message || e}` };
  }
}

async function verifyIdpay(authority: string, amountToman: number, apiKey: string, sandbox: boolean): Promise<VerifyResult> {
  const base = 'https://api.idpay.ir/v1.1/payment/verify';
  const amountRial = amountToman * 10;
  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
        'X-SANDBOX': sandbox ? '1' : '0',
      },
      body: JSON.stringify({ id: authority, order_id: '', amount: amountRial }),
    });
    const data = await res.json();
    if (data?.status >= 100 && data?.status < 200) {
      return { ok: true, provider: 'idpay', refId: String(data.track_id) };
    }
    return { ok: false, provider: 'idpay', error: data?.error_message || 'تأیید پرداخت آیدی‌پی ناموفق بود' };
  } catch (e: any) {
    return { ok: false, provider: 'idpay', error: `خطا در تأیید آیدی‌پی: ${e?.message || e}` };
  }
}

// --------------------------- PUBLIC API -------------------------
export async function createPayment(req: PaymentRequest): Promise<PaymentStart> {
  const g = getGateway();
  if (g === 'zarinpal') return startZarinpal(req);
  if (g === 'idpay') return startIdpay(req);
  return startMock(req);
}

export async function verifyPayment(req: VerifyRequest): Promise<VerifyResult> {
  const g = getGateway();
  if (g === 'zarinpal') {
    const merchant = process.env.ZARINPAL_MERCHANT_ID || '';
    const sandbox = boolEnv('ZARINPAL_SANDBOX', true);
    if (!merchant) return { ok: false, provider: 'zarinpal', error: 'ZARINPAL_MERCHANT_ID تنظیم نشده است' };
    return verifyZarinpal(req.authority, req.amountToman, merchant, sandbox);
  }
  if (g === 'idpay') {
    const apiKey = process.env.IDPAY_API_KEY || '';
    const sandbox = boolEnv('IDPAY_SANDBOX', true);
    if (!apiKey) return { ok: false, provider: 'idpay', error: 'IDPAY_API_KEY تنظیم نشده است' };
    return verifyIdpay(req.authority, req.amountToman, apiKey, sandbox);
  }
  // mock: trust the gateway status we already validated in the callback
  return { ok: true, provider: 'mock', refId: 'mock' };
}
