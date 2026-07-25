import { NextResponse } from 'next/server';
import { getDB } from '@/server/db';

// One-click backup of the customer portal server data (members, memberships,
// invoices, payments, plans, check-ins). The management app's own data is
// backed up separately from the settings page; this covers the server side.
export async function GET() {
  try {
    const db = getDB();
    const json = JSON.stringify(db, null, 2);
    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="portal-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'خطا' }, { status: 500 });
  }
}
