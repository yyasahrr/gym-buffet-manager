import { NextResponse } from 'next/server';
import { getDB, findMemberByToken, addCheckin, genId } from '@/server/db';

// Records a member check-in (attendance) from a scanned QR code.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token: string = body.token || body.memberId || '';
    if (!token) {
      return NextResponse.json({ ok: false, error: 'توکن عضویت ارسال نشده است' }, { status: 400 });
    }
    const member = findMemberByToken(token);
    if (!member) {
      return NextResponse.json({ ok: false, error: 'عضو یافت نشد' }, { status: 404 });
    }
    const checkin = addCheckin({
      id: genId('ck'),
      memberId: member.id,
      memberName: member.name,
      at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, member: member.name, at: checkin.at });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'خطا' }, { status: 500 });
  }
}

// List today's check-ins (management monitoring).
export async function GET() {
  try {
    const checkins = getDB().checkins;
    return NextResponse.json({ ok: true, checkins });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'خطا' }, { status: 500 });
  }
}
