import { NextResponse } from 'next/server';
import {
  findPaymentByAuthority,
  savePayment,
  findInvoice,
  saveInvoice,
  findMemberById,
  upsertMember,
  genId,
} from '@/server/db';
import { getGateway, verifyPayment } from '@/server/gateway';
import type { PortalInvoice, PortalInvoiceStatus } from '@/lib/portal-types';

function recomputeStatus(inv: PortalInvoice): PortalInvoiceStatus {
  // One-time invoices track payment via `status`; installment invoices via
  // their installment rows. Mirrors src/lib/membership.ts::computeInvoiceStatus.
  const paid = inv.isInstallment
    ? inv.installments.reduce((s, i) => s + (i.paid ? i.amount : 0), 0)
    : inv.status === 'paid'
      ? inv.total
      : 0;
  if (paid >= inv.total && inv.total > 0) return 'paid';
  if (paid > 0) {
    if (inv.isInstallment && inv.installments.some((i) => !i.paid && new Date(i.dueDate) < new Date())) return 'overdue';
    return 'partial';
  }
  if (inv.isInstallment && inv.installments.some((i) => !i.paid && new Date(i.dueDate) < new Date())) return 'overdue';
  return 'unpaid';
}

// Gateway callback / redirect target.
// - mock: trusts our own gateway's "status" flag.
// - zarinpal/idpay: verifies the transaction with the gateway using the
//   authority returned at initiate time, then marks the invoice paid.
// - buffet payments update the member's buffet balance and redirect to /customer.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const gateway = getGateway();

  let authority = '';
  let success = false;
  let refId: string | undefined;

  if (gateway === 'mock') {
    authority = url.searchParams.get('authority') || '';
    success = (url.searchParams.get('status') || 'OK') === 'OK';
  } else if (gateway === 'zarinpal') {
    authority = url.searchParams.get('Authority') || '';
    if ((url.searchParams.get('Status') || '') === 'OK') {
      const payment = findPaymentByAuthority(authority);
      const verify = await verifyPayment({ authority, amountToman: payment?.amount || 0 });
      success = verify.ok;
      refId = verify.refId;
    }
  } else if (gateway === 'idpay') {
    authority = url.searchParams.get('id') || '';
    const status = Number(url.searchParams.get('status') || '0');
    if (status >= 100) {
      const payment = findPaymentByAuthority(authority);
      const verify = await verifyPayment({ authority, amountToman: payment?.amount || 0 });
      success = verify.ok;
      refId = verify.refId;
    }
  }

  const payment = findPaymentByAuthority(authority);
  if (!payment) {
    return NextResponse.redirect(`${origin}/portal?error=payment_not_found`);
  }

  const invoice = payment.invoiceId ? findInvoice(payment.invoiceId) : undefined;
  const member = invoice
    ? findMemberById(invoice.memberId)
    : payment.memberId
      ? findMemberById(payment.memberId)
      : undefined;
  const token = member?.portalToken || '';
  const returnUrl = url.searchParams.get('returnUrl') || '';

  if (success) {
    payment.status = 'success';
    if (refId) payment.refId = refId;
    savePayment(payment);

    // Buffet charge / debt settlement: update balance + record transaction.
    if (payment.kind === 'buffet' && payment.memberId) {
      const m = findMemberById(payment.memberId);
      if (m) {
        m.buffetBalance = (m.buffetBalance || 0) + payment.amount;
        m.buffetTransactions = m.buffetTransactions || [];
        m.buffetTransactions.push({
          id: genId('btx'),
          date: new Date().toISOString(),
          type: 'credit',
          amount: payment.amount,
          description: 'شارژ / تسویه از طریق درگاه',
        });
        upsertMember(m);
      }
      const dest = returnUrl ? `${origin}${returnUrl}` : `${origin}/customer`;
      return NextResponse.redirect(`${dest}?paid=1`);
    }

    if (payment.kind === 'trainer_booking') {
      // تراکنش رزرو مربی در سرور قطعی شد؛ کلاینت با bookingId آن را همگام می‌کند.
      const dest = returnUrl ? `${origin}${returnUrl}` : `${origin}/trainer-marketplace`;
      const sep = dest.includes('?') ? '&' : '?';
      return NextResponse.redirect(`${dest}${sep}paid=1&booking=${encodeURIComponent(payment.bookingId || '')}&ref=${encodeURIComponent(refId || '')}`);
    }

    if (invoice) {
      if (payment.installmentId) {
        const ins = invoice.installments.find((i) => i.id === payment.installmentId);
        if (ins) {
          ins.paid = true;
          ins.paidDate = new Date().toISOString();
        }
      } else {
        // Paying the whole invoice (one-time or single-installment).
        invoice.status = 'paid';
        invoice.installments = invoice.installments.map((i) => ({ ...i, paid: true, paidDate: i.paidDate || new Date().toISOString() }));
      }
      invoice.status = recomputeStatus(invoice);
      saveInvoice(invoice);
    }
    // Self-service customers return to their dashboard; admin-shared-link
    // payers return to the shared portal view.
    const dest = returnUrl ? `${origin}${returnUrl}` : `${origin}/portal/${token}`;
    const sep = dest.includes('?') ? '&' : '?';
    return NextResponse.redirect(`${dest}${sep}paid=1${payment.invoiceId ? '&invoice=' + payment.invoiceId : ''}`);
  } else {
    payment.status = 'failed';
    savePayment(payment);
    const dest = returnUrl ? `${origin}${returnUrl}` : (payment.kind === 'buffet' ? `${origin}/customer` : `${origin}/portal/${token}`);
    return NextResponse.redirect(`${dest}?paid=0`);
  }
}
