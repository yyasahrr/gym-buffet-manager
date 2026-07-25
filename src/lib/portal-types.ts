// Backend (server-side) types for the customer payment portal.
// These mirror the tuition data needed by members to view and pay their fees.
// The source of truth for the portal lives on the server (not in the gym's
// localStorage) so members can pay from their own devices.

import type { MembershipPlan } from './types';
export type { MembershipPlan };

export type BuffetTx = {
  id: string;
  date: string;
  type: 'credit' | 'debit'; // واریز (افزایش موجودی) | برداشت/بدهی
  amount: number;
  description: string;
};

export type PortalMember = {
  id: string;
  name: string;
  customerId?: string; // link back to the local gym customer
  nationalId?: string; // کد ملی — شناسه یکتای ورود مشتری
  lastName?: string;   // نام خانوادگی
  email?: string;   // برای ارسال لینک پرداخت (از مشتری محلی)
  phone?: string;   // برای ارسال پیامک پرداخت
  buffetBalance?: number; // موجودی حساب بوفه (مثبت=بستانکار، منفی=بدهکار)
  buffetTransactions?: BuffetTx[]; // گردش حساب بوفه
  username?: string;
  passwordHash?: string; // scrypt-style hash for credential login
  salt?: string;
  portalToken: string; // for the private/shareable link
  createdAt: string;
};

export type PortalInstallment = {
  id: string;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
};

export type PortalInvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

export type PortalInvoice = {
  id: string; // matches the local membership invoice id
  memberId: string;
  membershipId?: string; // links the invoice to a portal membership
  planId?: string; // links the invoice to a management-defined plan
  title: string;
  total: number;
  isInstallment: boolean;
  installments: PortalInstallment[];
  status: PortalInvoiceStatus;
  issueDate?: string; // ISO issue date (from management or server)
  createdAt: string;
};

export type PortalCheckin = {
  id: string;
  memberId: string;
  memberName?: string;
  at: string; // ISO timestamp
  note?: string;
};

export type PaymentStatus = 'pending' | 'success' | 'failed';

export type Payment = {
  id: string;
  invoiceId?: string;
  installmentId?: string;
  memberId?: string; // for buffet payments
  kind?: 'invoice' | 'buffet' | 'trainer_booking'; // default 'invoice'
  bookingId?: string;
  trainerId?: string;
  gymShare?: number;
  trainerShare?: number;
  amount: number;
  authority: string;
  status: PaymentStatus;
  refId?: string;   // gateway reference id (e.g. Zarinpal ref_id) for real gateways
  createdAt: string;
};

export type MembershipStatus = 'active' | 'expired' | 'paused' | 'cancelled';

export type PortalMembership = {
  id: string;
  memberId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  note?: string;
};

export type PortalDB = {
  members: PortalMember[];
  invoices: PortalInvoice[];
  payments: Payment[];
  plans: MembershipPlan[];
  memberships: PortalMembership[];
  checkins: PortalCheckin[];
};

export function emptyDB(): PortalDB {
  return { members: [], invoices: [], payments: [], plans: [], memberships: [], checkins: [] };
}
