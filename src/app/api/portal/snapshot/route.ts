import { NextResponse } from 'next/server';
import { getDB } from '@/server/db';

// Full snapshot of portal data so the management app can pull self-service
// activity (members, memberships, invoices, plans) back into its local lists.
export async function GET() {
  try {
    const db = getDB();
    const members = db.members.map((m) => ({
      id: m.id,
      name: m.name,
      lastName: m.lastName,
      nationalId: m.nationalId,
      phone: m.phone,
      email: m.email,
    }));
    return NextResponse.json({
      ok: true,
      members,
      memberships: db.memberships,
      invoices: db.invoices,
      plans: db.plans,
      checkins: db.checkins,
    });
  } catch (e) {
    console.error('snapshot error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
