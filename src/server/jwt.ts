import crypto from 'crypto';

/**
 * توکن JWT ساده و بدون وابستگی خارجی (HS256).
 * در محیط واقعی SECRET باید از متغیر محیطی APP_JWT_SECRET تأمین شود.
 */
const DEFAULT_SECRET = process.env.APP_JWT_SECRET || 'dev-insecure-gym-buffet-secret-change-me';

export interface JwtPayload {
  sub?: string; // userId
  username?: string;
  role?: string; // ManagementRole
  tenantId?: string;
  iat?: number;
  exp?: number;
}

function b64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

export function signToken(
  payload: JwtPayload,
  secret: string = DEFAULT_SECRET,
  expiresInSec = 60 * 60 * 24 * 7,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const data = `${b64urlJson(header)}.${b64urlJson(body)}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string, secret: string = DEFAULT_SECRET): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
  const provided = Buffer.from(s);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(provided, expectedBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf-8')) as JwtPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
