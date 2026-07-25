import { NextResponse, NextRequest } from 'next/server';
import { findInvoice, findMemberByToken, createPayment as createPaymentRecord, genId } from '@/server/db';
import { createPayment } from '@/server/gateway';

// Create a payment request via the configured gateway (mock by default;
// zarinpal/idpay when PAYMENT_GATEWAY is set).
// - kind "invoice": pays a tuition invoice (or a single installment).
// - kind "buffet": charges / settles the customer's buffet account.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const kind = body.kind === 'buffet' ? 'buffet' : body.kind === 'trainer_booking' ? 'trainer_booking' : 'invoice';
    const origin = new URL(req.url).origin;
    const callbackUrl = `${process.env.PORTAL_PUBLIC_URL || origin}/api/payments/callback`;

    let amount = 0;
    let memberId = '';
    let invoiceId: string | undefined;
    let installmentId: string | undefined;
    let description = '';

    let returnUrl = '/customer';
    if (kind === 'invoice') {
      invoiceId = body.invoiceId;
      installmentId = body.installmentId;
      if (!invoiceId) return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });
      const invoice = findInvoice(invoiceId);
      if (!invoice) return NextResponse.json({ error: 'فاکتور یافت نشد' }, { status: 404 });
      amount = installmentId
        ? invoice.installments.find((i) => i.id === installmentId)?.amount || 0
        : invoice.total;
      memberId = invoice.memberId;
      description = `پرداخت ${invoice.title}`;
      // Self-service customers (session cookie) return to their dashboard;
      // admin-shared-link payers (token) return to the shared portal view.
      const cookieToken = req.cookies.get('cust_session')?.value;
      if (cookieToken) {
        returnUrl = '/customer';
      } else {
        const token = body.token || '';
        const member = token ? findMemberByToken(token) : undefined;
        returnUrl = member ? `/portal/${member.portalToken}` : '/customer';
      }
    } else if (kind === 'trainer_booking') {
      amount = Number(body.amount) || 0;
      memberId = String(body.memberId || '');
      if (!body.bookingId || !body.trainerId || amount <= 0) return NextResponse.json({ error: 'اطلاعات رزرو مربی ناقص است' }, { status: 400 });
      description = `رزرو جلسه مربی ${body.trainerId}`;
      returnUrl = '/trainer-marketplace';
    } else {
      amount = Number(body.amount) || 0;
      if (amount <= 0) return NextResponse.json({ error: 'مبلغ نامعتبر' }, { status: 400 });
      // Resolve the member from the session cookie (customer portal) or a
      // provided token (admin-shared link). The cookie is httpOnly.
      const cookieToken = req.cookies.get('cust_session')?.value;
      const token = body.token || cookieToken;
      const member = token ? findMemberByToken(token) : undefined;
      if (!member) return NextResponse.json({ error: 'عضو یافت نشد' }, { status: 404 });
      memberId = member.id;
      description = 'شارژ / تسویه حساب بوفه';
      returnUrl = '/customer';
    }

    if (amount <= 0) return NextResponse.json({ error: 'مبلغ نامعتبر' }, { status: 400 });

    const authority = genId('auth').replace(/[^a-zA-Z0-9]/g, '');
    createPaymentRecord({
      id: genId('pay'),
      invoiceId,
      installmentId,
      memberId,
      kind,
      bookingId: kind === 'trainer_booking' ? body.bookingId : undefined,
      trainerId: kind === 'trainer_booking' ? body.trainerId : undefined,
      gymShare: kind === 'trainer_booking' ? Number(body.gymShare) || 0 : undefined,
      trainerShare: kind === 'trainer_booking' ? Number(body.trainerShare) || 0 : undefined,
      amount,
      authority,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const start = await createPayment({
      amountToman: amount,
      callbackUrl,
      description,
      orderId: authority,
      returnUrl,
    });

    if (!start.ok || !start.url) {
      return NextResponse.json({ error: start.error || 'درگاه در دسترس نیست' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, url: start.url, amount });
  } catch (e: any) {
    console.error('initiate error', e);
    return NextResponse.json({ error: 'initiate failed' }, { status: 500 });
  }
}
