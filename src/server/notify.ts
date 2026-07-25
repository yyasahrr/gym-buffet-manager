// Server-side notification delivery (email / SMS) for the customer payment portal.
//
// Architecture:
// - A pluggable provider per channel. Defaults to a "log" provider that records
//   every message to server-data/notifications.json and the server console, so the
//   full flow works with zero external configuration.
// - For real delivery, flip the provider via environment variables and supply
//   credentials (see .env.example). The code degrades gracefully to "log" if the
//   real provider is misconfigured or its optional dependency is missing.
//
// Email real provider: SMTP via `nodemailer` (optional dep — `npm i nodemailer`).
// SMS  real provider: any HTTP webhook (Kavenegar/FarazSMS/...) via `SMS_WEBHOOK_URL`.

import fs from 'fs';
import path from 'path';

export type Channel = 'email' | 'sms';
export type NotificationStatus = 'sent' | 'failed' | 'logged';

export type NotificationRecord = {
  id: string;
  createdAt: string;
  channel: Channel;
  provider: string;
  to: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  error?: string;
};

export type SendResult = {
  channel: Channel;
  to: string;
  provider: string;
  status: NotificationStatus;
  error?: string;
};

const DATA_DIR = path.join(process.cwd(), 'server-data');
const NOTIF_FILE = path.join(DATA_DIR, 'notifications.json');

function getEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readNotifications(): NotificationRecord[] {
  ensureDir();
  if (!fs.existsSync(NOTIF_FILE)) return [];
  try {
    const raw = fs.readFileSync(NOTIF_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordNotification(rec: NotificationRecord) {
  ensureDir();
  const all = readNotifications();
  all.push(rec);
  const trimmed = all.slice(-500); // keep most recent 500
  fs.writeFileSync(NOTIF_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

async function deliverEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const provider = getEnv('PORTAL_EMAIL_PROVIDER', 'log');

  if (provider === 'smtp') {
    try {
      // Optional dependency: only required when SMTP is enabled.
      // @ts-ignore - module is not installed by default
      const mod: any = await import('nodemailer');
      const nm: any = mod.default || mod;
      const transport = nm.createTransport({
        host: getEnv('SMTP_HOST', 'localhost'),
        port: Number(getEnv('SMTP_PORT', '587')),
        secure: getEnv('SMTP_SECURE', 'false') === 'true',
        auth: getEnv('SMTP_USER', '')
          ? { user: getEnv('SMTP_USER', ''), pass: getEnv('SMTP_PASS', '') }
          : undefined,
      });
      await transport.sendMail({
        from: getEnv('SMTP_FROM', getEnv('PORTAL_FROM_EMAIL', 'no-reply@gym.local')),
        to,
        subject,
        html,
      });
      return { channel: 'email', to, provider, status: 'sent' };
    } catch (e: any) {
      console.error('[NOTIFY:email:smtp] failed', e?.message || e);
      return { channel: 'email', to, provider, status: 'failed', error: e?.message || String(e) };
    }
  }

  // default: 'log'
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`[NOTIFY:email:log] to=${to} subject="${subject}" :: ${text}`);
  return { channel: 'email', to, provider: 'log', status: 'logged' };
}

async function deliverSms(to: string, text: string): Promise<SendResult> {
  const provider = getEnv('PORTAL_SMS_PROVIDER', 'log');

  if (provider === 'webhook') {
    const url = getEnv('SMS_WEBHOOK_URL', '');
    if (!url) {
      return { channel: 'sms', to, provider, status: 'failed', error: 'SMS_WEBHOOK_URL not set' };
    }
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receptor: to, to, mobile: to, text }),
      });
      return { channel: 'sms', to, provider, status: 'sent' };
    } catch (e: any) {
      console.error('[NOTIFY:sms:webhook] failed', e?.message || e);
      return { channel: 'sms', to, provider, status: 'failed', error: e?.message || String(e) };
    }
  }

  // default: 'log'
  console.log(`[NOTIFY:sms:log] to=${to} :: ${text}`);
  return { channel: 'sms', to, provider: 'log', status: 'logged' };
}

export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const res = await deliverEmail(to, subject, html);
  recordNotification({
    id: genId('ntf'),
    createdAt: new Date().toISOString(),
    channel: 'email',
    provider: res.provider,
    to,
    subject,
    body: html,
    status: res.status,
    error: res.error,
  });
  return res;
}

export async function sendSms(to: string, text: string): Promise<SendResult> {
  const res = await deliverSms(to, text);
  recordNotification({
    id: genId('ntf'),
    createdAt: new Date().toISOString(),
    channel: 'sms',
    provider: res.provider,
    to,
    body: text,
    status: res.status,
    error: res.error,
  });
  return res;
}

export function getNotifications(limit = 50): NotificationRecord[] {
  return readNotifications().slice(-limit).reverse();
}
