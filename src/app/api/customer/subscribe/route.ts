import { NextResponse, NextRequest } from 'next/server';
import {
  findMemberByToken,
  getPlans,
  addMembership,
  saveInvoice,
  genId,
} from '@/server/db';
import { computeEndDate, generateInstallmentDates } from '@/lib/membership';
import type { PortalMembership, PortalInvoice } from '@/lib/portal-types';

// Customer subscribes to a plan defined in management. Creates a server-side
// membership + invoice (one-time, or installments on 1st/15th for private plans)
// linked to the logged-in customer, then returns the invoice id to pay.
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('cust_session')?.value;
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const member = findMemberByToken(token);
    if (!member) return NextResponse.json({ error: 'member not found' }, { status: 404 });

    const body = await req.json();
    const planId: string = body.planId;
    const plan = getPlans().find((p) => p.id === planId);
    if (!plan) return NextResponse.json({ error: 'پلن یافت نشد' }, { status: 400 });

    const startDate = new Date().toISOString();
    const endDate = computeEndDate(startDate, plan.period);
    const membership: PortalMembership = {
      id: genId('sub'),
      memberId: member.id,
      planId,
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
      title: `اشتراک ${plan.name}`,
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
    console.error('subscribe error', e);
    return NextResponse.json({ error: 'subscribe failed' }, { status: 500 });
  }
}
