import { NextResponse } from 'next/server';
import { findMemberByNationalId, upsertMember, genToken } from '@/server/db';
import { createOtp } from '@/server/otp';

// Initiate login or registration. The member is identified by national ID
// (کد ملی). If it does not exist yet, a member record is created (registration);
// otherwise the existing record is updated (login). An OTP is then sent via SMS.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nationalId: string = (body.nationalId || '').toString().trim();
    const phone: string = (body.phone || '').toString().trim();
    const name: string = (body.name || '').toString().trim();
    const family: string = (body.family || '').toString().trim();

    if (!/^\d{10}$/.test(nationalId)) {
      return NextResponse.json({ error: 'کد ملی باید ۱۰ رقم باشد' }, { status: 400 });
    }
    if (!/^09\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'شماره موبایل معتبر نیست (مثال: 09123456789)' }, { status: 400 });
    }

    let member = findMemberByNationalId(nationalId);
    if (!member) {
      member = {
        id: `mem-${nationalId}`,
        name: name || 'مشتری',
        nationalId,
        lastName: family || undefined,
        phone,
        portalToken: genToken(),
        createdAt: new Date().toISOString(),
      };
    } else {
      member.phone = phone;
      if (name) member.name = name;
      if (family) member.lastName = family;
      if (!member.portalToken) member.portalToken = genToken();
    }
    upsertMember(member);

    createOtp(nationalId, phone);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('send-otp error', e);
    return NextResponse.json({ error: 'send-otp failed' }, { status: 500 });
  }
}
