import { NextResponse, NextRequest } from 'next/server';
import {
  findMemberByToken,
  getPlans,
  findMembership,
  addMembership,
  saveInvoice,
  getDB,
  saveDB,
  genId,
} from '@/server/db';
import { computeEndDate, generateInstallmentDates } from '@/lib/membership';
import type { PortalMembership, PortalInvoice } from '@/lib/portal-types';

// Customer renews an existing membership for the same plan. The old membership
// is marked expired and a new active one + invoice is created to pay.
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('cust_session')?.value;
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const member = findMemberByToken(token);
    if (!member) return NextResponse.json({ error: 'member not found' }, { status: 404 });

    const body = await req.json();
    const membershipId: string = body.membershipId;
    const old = findMembership(membershipId);
    if (!old || old.memberId !== member.id) return NextResponse.json({ error: 'عضویت یافت نشد' }, { status: 404 });

    const plan = getPlans().find((p) => p.id === old.planId);
    if (!plan) return NextResponse.json({ error: 'پلن یافت نشد' }, { status: 400 });

    // Mark the old membership as expired.
    const db = getDB();
    const idx = db.memberships.findIndex((m) => m.id === old.id);
    if (idx >= 0) db.memberships[idx].status = 'expired';
    saveDB(db);

    const startDate = new Date().toISOString();
    const endDate = computeEndDate(startDate, plan.period);
    const membership: PortalMembership = {
      id: genId('sub'),
      memberId: member.id,
      planId: plan.id,
      startDate,
      endDate,
      status: 'active',
    };
    addMembership(membership);

    const isPrivate = plan.category === 'private';
    let installments: PortalInvoice['installments'] = [];
    if (isPrivate) {
      const dates = generateInstallmentDates(2, startDate, true);
      const base = Math.floor(plan.price / 2);
      installments = [
        { id: genId('inst'), dueDate: dates[0], amount: base, paid: false },
        { id: genId('inst'), dueDate: dates[1], amount: plan.price - base, paid: false },
      ];
    }

    const invoice: PortalInvoice = {
      id: genId('inv'),
      memberId: member.id,
      membershipId: membership.id,
      planId: plan.id,
      title: `تمدید اشتراک ${plan.name}`,
      issueDate: startDate,
      total: plan.price,
      isInstallment: isPrivate,
      installments,
      status: 'unpaid',
      createdAt: startDate,
    };
    saveInvoice(invoice);

    return NextResponse.json({ ok: true, invoiceId: invoice.id, membershipId: membership.id });
  } catch (e: any) {
    console.error('renew error', e);
    return NextResponse.json({ error: 'renew failed' }, { status: 500 });
  }
}
