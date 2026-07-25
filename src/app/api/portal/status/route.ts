import { NextResponse } from 'next/server';
import { getDB } from '@/server/db';

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Returns a lightweight snapshot of the customer portal server so the
// management "Portal Console" can monitor activity in real time.
export async function GET() {
  try {
    const db = getDB();
    const now = Date.now();

    const pendingPayments = db.payments.filter((p) => p.status === 'pending').length;
    const successfulPayments = db.payments.filter((p) => p.status === 'success').length;
    const unpaidInvoices = db.invoices.filter((i) => i.status === 'unpaid' || i.status === 'partial' || i.status === 'overdue').length;
    const activeMembers = db.members.filter((m) => m.portalToken).length;
    const todayStart = startOfToday();
    const checkinsToday = db.checkins.filter((c) => new Date(c.at).getTime() >= todayStart);

    const recent = [...db.payments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)
      .map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        authority: p.authority,
        createdAt: p.createdAt,
      }));

    const lastModified =
      db.payments.length > 0
        ? db.payments.reduce((max, p) => Math.max(max, new Date(p.createdAt).getTime()), 0)
        : now;

    return NextResponse.json({
      ok: true,
      at: new Date().toISOString(),
      counts: {
        members: db.members.length,
        activeMembers,
        memberships: db.memberships.length,
        invoices: db.invoices.length,
        unpaidInvoices,
        payments: db.payments.length,
        pendingPayments,
        successfulPayments,
        plans: db.plans.length,
        checkinsToday: checkinsToday.length,
      },
      lastModified,
      recent,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'خطا' }, { status: 500 });
  }
}
