import { NextResponse } from 'next/server';
import { getAllMembers } from '@/server/db';

// Returns all portal members (self-registered or synced) so the management app
// can pull them into its local customer list (reverse-sync).
export async function GET() {
  try {
    const members = getAllMembers().map((m) => ({
      id: m.id,
      name: m.name,
      lastName: m.lastName,
      nationalId: m.nationalId,
      phone: m.phone,
      email: m.email,
    }));
    return NextResponse.json({ ok: true, members });
  } catch (e) {
    console.error('members error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
