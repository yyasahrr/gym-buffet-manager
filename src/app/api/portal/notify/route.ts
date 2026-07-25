import { NextResponse } from 'next/server';
import { findMemberByToken, getInvoicesForMember } from '@/server/db';
import { sendEmail, sendSms } from '@/server/notify';

function fmtMoney(n: number): string {
  try {
    return (n || 0).toLocaleString('fa-IR');
  } catch {
    return String(n || 0);
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fa-IR');
  } catch {
    return iso;
  }
}

function buildEmailHtml(name: string, link: string, remaining: number, nextDue: string, custom?: string): string {
  return `<div dir="rtl" style="font-family: Vazirmatn, Tahoma, sans-serif; max-width:480px; margin:auto;">
  <h2 style="color:#1d4ed8;">سلام ${name} عزیز</h2>
  <p>لینک پرداخت شهریه باشگاه برای شما آماده شد:</p>
  <p style="margin: 12px 0;">
    <a href="${link}" style="display:inline-block; background:#2563eb; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none;">مشاهده و پرداخت</a>
  </p>
  <p style="word-break:break-all; color:#374151;">${link}</p>
  ${remaining > 0 ? `<p>مبلغ باقی‌مانده: <strong>${fmtMoney(remaining)} تومان</strong></p>` : ''}
  ${nextDue ? `<p>اولین سررسید: ${fmtDate(nextDue)}</p>` : ''}
  ${custom ? `<p style="color:#6b7280;">${custom}</p>` : ''}
  <hr style="margin:16px 0; border:none; border-top:1px solid #e5e7eb;" />
  <p style="font-size:12px; color:#9ca3af;">با احترام — مدیریت باشگاه</p>
</div>`;
}

function buildSmsText(name: string, link: string, remaining: number, nextDue: string, custom?: string): string {
  let t = `باشگاه ورزشی: ${name} عزیز، لینک پرداخت شهریه: ${link}`;
  if (remaining > 0) t += ` — مبلغ باقی‌مانده: ${fmtMoney(remaining)} تومان`;
  if (nextDue) t += ` — سررسید: ${fmtDate(nextDue)}`;
  if (custom) t += ` | ${custom}`;
  return t;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token: string = body.token;
    const channel: 'email' | 'sms' | 'both' = body.channel || 'both';
    const email: string | undefined = body.email || undefined;
    const phone: string | undefined = body.phone || undefined;
    const customMessage: string | undefined = body.message || undefined;

    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

    const member = findMemberByToken(token);
    if (!member) return NextResponse.json({ error: 'member not found' }, { status: 404 });

    const base = process.env.PORTAL_PUBLIC_URL || new URL(req.url).origin;
    const link = `${base}/portal/${token}`;

    // Compute remaining due amount and next due date from the member's invoices.
    const invoices = getInvoicesForMember(member.id);
    let remaining = 0;
    let nextDue = '';
    for (const inv of invoices) {
      if (inv.isInstallment) {
        for (const ins of inv.installments) {
          if (!ins.paid) {
            remaining += ins.amount;
            if (!nextDue || new Date(ins.dueDate) < new Date(nextDue)) nextDue = ins.dueDate;
          }
        }
      } else if (inv.status !== 'paid') {
        remaining += inv.total;
      }
    }

    const rcptEmail = email || member.email;
    const rcptPhone = phone || member.phone;

    const results: Record<string, any> = {};

    if (channel === 'email' || channel === 'both') {
      if (!rcptEmail) {
        results.email = { status: 'failed', error: 'آدرس ایمیل مشتری موجود نیست' };
      } else {
        const subject = `لینک پرداخت شهریه باشگاه — ${member.name}`;
        const html = buildEmailHtml(member.name, link, remaining, nextDue, customMessage);
        results.email = await sendEmail(rcptEmail, subject, html);
      }
    }

    if (channel === 'sms' || channel === 'both') {
      if (!rcptPhone) {
        results.sms = { status: 'failed', error: 'شماره موبایل مشتری موجود نیست' };
      } else {
        const text = buildSmsText(member.name, link, remaining, nextDue, customMessage);
        results.sms = await sendSms(rcptPhone, text);
      }
    }

    return NextResponse.json({ ok: true, link, results });
  } catch (e: any) {
    console.error('notify error', e);
    return NextResponse.json({ error: 'notify failed' }, { status: 500 });
  }
}
