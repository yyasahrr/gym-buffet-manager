'use client';

import { dataStore } from './store';
import type { AuditEntry } from './types';

const MAX_AUDIT = 500;

/**
 * Append an audit-log entry. Runs only in the browser (localStorage store).
 * Safe to call from anywhere; it never throws.
 */
export function logAudit(
  action: string,
  detail?: string,
  scope?: AuditEntry['scope'],
  actor?: string
) {
  if (typeof window === 'undefined') return;
  try {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      at: new Date().toISOString(),
      action,
      detail,
      scope,
      actor,
    };
    dataStore.saveData((cur) => ({
      ...cur,
      auditLog: [entry, ...(cur.auditLog || [])].slice(0, MAX_AUDIT),
    }));
  } catch {
    /* ignore */
  }
}

const ACTION_LABELS: Record<string, string> = {
  'membership.created': 'ثبت عضویت',
  'membership.renewed': 'تمدید عضویت',
  'membership.cancelled': 'لغو عضویت',
  'plan.created': 'تعریف پلن',
  'plan.updated': 'ویرایش پلن',
  'plan.archived': 'بایگانی پلن',
  'invoice.created': 'صدور فاکتور شهریه',
  'invoice.paid': 'پرداخت شهریه',
  'order.created': 'ثبت سفارش بوفه',
  'payment.success': 'پرداخت موفق (درگاه)',
  'expense.created': 'ثبت هزینه',
  'purchase.created': 'ثبت خرید',
  'waste.created': 'ثبت ضایعات',
  'product.created': 'تعریف محصول',
  'customer.created': 'ثبت مشتری',
  'data.imported': 'بازیابی داده',
  'data.reset': 'بازنشانی داده',
  'auth.login': 'ورود مدیریت',
  'auth.logout': 'خروج مدیریت',
  'checkin': 'چک‌این عضو',
  'loyalty.adjust': 'تنظیم امتیاز وفاداری',
  'portal.sync': 'هم‌سنک پورتال',
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}
