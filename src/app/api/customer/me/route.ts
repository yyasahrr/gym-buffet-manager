import { NextResponse, NextRequest } from 'next/server';
import { findMemberByToken, getInvoicesForMember, getMembershipsForMember } from '@/server/db';

// Returns the authenticated customer's dashboard data (buffet balance +
// transactions + tuition invoices + memberships) based on the session cookie.
export async function GET(req: NextRequest) {
  const token = req.cookies.get('cust_session')?.value;
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const member = findMemberByToken(token);
  if (!member) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const invoices = getInvoicesForMember(member.id);
  const memberships = getMembershipsForMember(member.id).map((m) => ({
    id: m.id,
    planId: m.planId,
    startDate: m.startDate,
    endDate: m.endDate,
    status: m.status,
  }));
  return NextResponse.json({
    ok: true,
    member: {
      id: member.id,
      name: member.name,
      lastName: member.lastName,
      nationalId: member.nationalId,
      phone: member.phone,
      email: member.email,
      portalToken: member.portalToken,
      buffetBalance: member.buffetBalance || 0,
      buffetTransactions: member.buffetTransactions || [],
    },
    invoices,
    memberships,
  });
}
