import { NextResponse } from 'next/server';
import { findMemberByNationalId } from '@/server/db';
import { verifyOtp } from '@/server/otp';

// Verify the OTP and establish a session cookie for the customer portal.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nationalId: string = (body.nationalId || '').toString().trim();
    const code: string = (body.code || '').toString().trim();

    if (!verifyOtp(nationalId, code)) {
      return NextResponse.json({ error: 'کد تایید نامعتبر یا منقضی شده است' }, { status: 401 });
    }
    const member = findMemberByNationalId(nationalId);
    if (!member || !member.portalToken) {
      return NextResponse.json({ error: 'عضو یافت نشد' }, { status: 404 });
    }
    const res = NextResponse.json({ ok: true, token: member.portalToken });
    res.cookies.set('cust_session', member.portalToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error('verify-otp error', e);
    return NextResponse.json({ error: 'verify failed' }, { status: 500 });
  }
}
