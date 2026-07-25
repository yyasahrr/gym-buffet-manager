import { NextResponse } from 'next/server';
import {
  findMemberById,
  findMemberByNationalId,
  upsertMember,
  findInvoice,
  saveInvoice,
  savePlans,
  genId,
  genToken,
  hashPassword,
  makeSalt,
} from '@/server/db';
import type { PortalMember, PortalInvoice, PortalInvoiceStatus, BuffetTx, MembershipPlan } from '@/lib/portal-types';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const customerId: string = body.customerId;
    const customerName: string = body.customerName || 'مشتری';
    if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 });

    // Resolve the member: prefer national ID (used by the customer self-service
    // portal) so a self-registered member is linked to the admin's customer.
    const nationalId: string | undefined = body.nationalId ? String(body.nationalId).trim() : undefined;
    let memberId = `mem-${customerId}`;
    let existing = findMemberById(memberId);
    if (nationalId) {
      const byNat = findMemberByNationalId(nationalId);
      if (byNat) {
        memberId = byNat.id;
        existing = byNat;
      }
    }

    let token = existing?.portalToken;
    if (!token) token = genToken();

    const member: PortalMember = {
      id: memberId,
      name: customerName,
      customerId,
      nationalId: body.nationalId || existing?.nationalId,
      lastName: body.lastName || existing?.lastName,
      email: body.email || existing?.email,
      phone: body.phone || existing?.phone,
      buffetBalance: body.buffetBalance !== undefined ? Number(body.buffetBalance) || 0 : existing?.buffetBalance,
      buffetTransactions: (Array.isArray(body.buffetTransactions) ? body.buffetTransactions : existing?.buffetTransactions) as BuffetTx[] | undefined,
      username: existing?.username,
      passwordHash: existing?.passwordHash,
      salt: existing?.salt,
      portalToken: token,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    // Optional credential login setup
    if (body.username && body.password) {
      const salt = makeSalt();
      member.username = body.username;
      member.salt = salt;
      member.passwordHash = hashPassword(body.password, salt);
    } else if (body.username) {
      member.username = body.username; // keep username, password unchanged
    }

    upsertMember(member);

    // Persist the gym's membership plans so customers can subscribe via the portal.
    if (Array.isArray(body.plans)) {
      const plans: MembershipPlan[] = body.plans.map((p: any) => ({
        id: p.id || `plan-${Date.now()}`,
        name: p.name || 'پلن',
        category: p.category || 'regular',
        period: p.period || 'monthly',
        price: Number(p.price) || 0,
        description: p.description || '',
        status: p.status || 'active',
      }));
      savePlans(plans);
    }

    const incomingInvoices = Array.isArray(body.invoices) ? body.invoices : [];
    for (const inc of incomingInvoices) {
      const existingInv = findInvoice(inc.id);
      // Preserve paid state from backend (portal payments are the source of truth)
      const installments = (inc.installments || []).map((ins: any) => {
        const prev = existingInv?.installments.find((p) => p.id === ins.id);
        return {
          id: ins.id,
          dueDate: ins.dueDate,
          amount: Number(ins.amount) || 0,
          paid: prev ? prev.paid : Boolean(ins.paid),
          paidDate: prev ? prev.paidDate : ins.paidDate,
        };
      });
      const inv: PortalInvoice = {
        id: inc.id,
        memberId,
        title: inc.title || 'فاکتور شهریه',
        total: Number(inc.total) || 0,
        isInstallment: Boolean(inc.isInstallment),
        installments,
        status: recomputeStatus({ ...inc, installments } as PortalInvoice),
        createdAt: existingInv?.createdAt || new Date().toISOString(),
      };
      saveInvoice(inv);
    }

    return NextResponse.json({
      ok: true,
      token,
      link: `/portal/${token}`,
      loginAvailable: Boolean(member.username),
      member: {
        id: member.id,
        name: member.name,
        lastName: member.lastName,
        nationalId: member.nationalId,
        phone: member.phone,
        email: member.email,
        buffetBalance: member.buffetBalance || 0,
        buffetTransactions: member.buffetTransactions || [],
      },
    });
  } catch (e) {
    console.error('sync error', e);
    return NextResponse.json({ error: 'sync failed' }, { status: 500 });
  }
}
