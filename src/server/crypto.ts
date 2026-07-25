import crypto from 'crypto';

/**
 * SHA-256 سروری بر پایه node:crypto. خروجی هگز است و دقیقاً با
 * پیاده‌سازی سمت‌کلاینت (TextEncoder + crypto.subtle) یکسانه تا هش رمزهای
 * ذخیره‌شده در دو طرف سازگار باشد.
 */
export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
