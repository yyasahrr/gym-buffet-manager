// One-Time-Password (OTP) store for customer self-service login via SMS.
//
// OTPs are generated server-side, stored in server-data/otp.json with a short
// expiry, and "sent" through the SMS provider (see src/server/notify). In the
// default "log" provider the code is recorded to server-data/notifications.json
// and a dev endpoint can reveal it for local testing (see the route).

import fs from 'fs';
import path from 'path';
import { sendSms } from './notify';

const DATA_DIR = path.join(process.cwd(), 'server-data');
const OTP_FILE = path.join(DATA_DIR, 'otp.json');

const OTP_TTL_MS = 2 * 60 * 1000; // 2 minutes

type OtpRecord = {
  nationalId: string;
  phone: string;
  code: string;
  expiresAt: number;
  createdAt: number;
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): OtpRecord[] {
  ensureDir();
  if (!fs.existsSync(OTP_FILE)) return [];
  try {
    const raw = fs.readFileSync(OTP_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(recs: OtpRecord[]) {
  ensureDir();
  fs.writeFileSync(OTP_FILE, JSON.stringify(recs, null, 2), 'utf-8');
}

function smsProviderIsLog(): boolean {
  return (process.env.PORTAL_SMS_PROVIDER || 'log') === 'log';
}

export function createOtp(nationalId: string, phone: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  const now = Date.now();
  const recs = readAll().filter((r) => r.nationalId !== nationalId); // one active OTP per nationalId
  recs.push({ nationalId, phone, code, expiresAt: now + OTP_TTL_MS, createdAt: now });
  writeAll(recs);

  const text = `باشگاه ورزشی: کد تایید ورود شما ${code} می‌باشد.`;
  // fire and forget; failures are logged by the provider
  sendSms(phone, text).catch(() => {});

  return code;
}

export function verifyOtp(nationalId: string, code: string): boolean {
  const recs = readAll();
  const idx = recs.findIndex((r) => r.nationalId === nationalId);
  if (idx < 0) return false;
  const rec = recs[idx];
  if (Date.now() > rec.expiresAt) {
    writeAll(recs.filter((_, i) => i !== idx)); // expired
    return false;
  }
  if (rec.code !== code) return false;
  writeAll(recs.filter((_, i) => i !== idx)); // consume
  return true;
}

// Dev/testing helper: reveals the pending OTP when SMS is in "log" mode or
// when explicitly enabled. MUST NOT be relied upon in production.
export function getDevOtp(nationalId: string): string | null {
  if (!smsProviderIsLog() && (process.env.PORTAL_DEV_SHOW_OTP || 'false') !== 'true') return null;
  const rec = readAll().find((r) => r.nationalId === nationalId && Date.now() <= r.expiresAt);
  return rec ? rec.code : null;
}
