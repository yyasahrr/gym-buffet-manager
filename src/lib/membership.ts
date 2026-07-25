import { addMonths, startOfMonth } from 'date-fns-jalali';
import { setDate } from 'date-fns';
import type {
  MembershipPlan,
  MembershipInvoice,
  PlanPeriod,
  PlanCategory,
  MembershipInvoiceStatus,
} from './types';

export const periodLabels: Record<PlanPeriod, string> = {
  monthly: 'ماهانه',
  quarterly: 'سه‌ماهه',
  semiannual: 'شش‌ماهه',
  annual: 'سالانه',
};

export const periodMonths: Record<PlanPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export const categoryLabels: Record<PlanCategory, string> = {
  private: 'خصوصی',
  regular: 'عادی',
};

/** Compute the membership end date (ISO) from a start date and plan period. */
export function computeEndDate(startDateISO: string, period: PlanPeriod): string {
  const start = new Date(startDateISO);
  const end = addMonths(start, periodMonths[period]);
  // Subtract a day so the last day of the period is inclusive.
  end.setDate(end.getDate() - 1);
  return end.toISOString();
}

/**
 * Generate `count` installment due dates (ISO strings).
 * - Private plans: due on the 1st and 15th of each month (30-day cycle).
 * - Regular plans: spread evenly across the plan period.
 */
export function generateInstallmentDates(
  count: number,
  issueDateISO: string,
  isPrivate: boolean
): string[] {
  const n = Math.max(1, Math.floor(count));
  const issue = new Date(issueDateISO);
  const dates: Date[] = [];

  if (isPrivate) {
    const baseMonth = startOfMonth(issue);
    for (let i = 0; i < n; i++) {
      const monthOffset = Math.floor(i / 2);
      const day = i % 2 === 0 ? 1 : 15;
      const d = addMonths(baseMonth, monthOffset);
      dates.push(setDate(d, day));
    }
  } else {
    const months = periodMonths['monthly'] * n; // generic spread: one month apart
    for (let i = 0; i < n; i++) {
      dates.push(addMonths(issue, i));
    }
    void months;
  }

  return dates.map((d) => d.toISOString());
}

/** Total amount already paid for an invoice. */
export function invoicePaid(invoice: MembershipInvoice): number {
  if (!invoice.isInstallment) {
    return invoice.status === 'paid' ? invoice.total : 0;
  }
  return invoice.installments.reduce((sum, ins) => sum + (ins.paid ? ins.amount : 0), 0);
}

/** Remaining (unpaid) amount for an invoice. */
export function invoiceRemaining(invoice: MembershipInvoice): number {
  return Math.max(0, invoice.total - invoicePaid(invoice));
}

/** Recompute the invoice status from its installments / payments. */
export function computeInvoiceStatus(invoice: MembershipInvoice): MembershipInvoiceStatus {
  const paid = invoicePaid(invoice);
  if (paid >= invoice.total && invoice.total > 0) return 'paid';
  if (paid > 0) {
    // partially paid; check overdue
    if (invoice.isInstallment && invoice.installments.some((ins) => !ins.paid && new Date(ins.dueDate) < new Date())) {
      return 'overdue';
    }
    return 'partial';
  }
  if (invoice.isInstallment && invoice.installments.some((ins) => !ins.paid && new Date(ins.dueDate) < new Date())) {
    return 'overdue';
  }
  return 'unpaid';
}

/** Days remaining until membership end (negative if expired). */
export function daysUntil(endDateISO: string, now: Date = new Date()): number {
  const end = new Date(endDateISO);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function planLabel(plan: MembershipPlan | undefined): string {
  if (!plan) return 'نامشخص';
  return `${plan.name} (${periodLabels[plan.period]})`;
}
