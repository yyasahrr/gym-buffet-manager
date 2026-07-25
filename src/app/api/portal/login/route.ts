import { NextResponse } from 'next/server';
import { findMemberByUsername, hashPassword } from '@/server/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username: string = body.username;
    const password: string = body.password;
    if (!username || !password) return NextResponse.json({ error: 'نام کاربری و رمز عبور لازم است' }, { status: 400 });

    const member = findMemberByUsername(username);
    if (!member || !member.passwordHash || !member.salt) {
      return NextResponse.json({ error: 'حسابی یافت نشد' }, { status: 401 });
    }
    const hash = hashPassword(password, member.salt);
    if (hash !== member.passwordHash) {
      return NextResponse.json({ error: 'رمز عبور اشتباه است' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, member: { id: member.id, name: member.name } });
    res.cookies.set('portalMember', member.id, { httpOnly: true, sameSite: 'lax', path: '/' });
    return res;
  } catch (e) {
    console.error('login error', e);
    return NextResponse.json({ error: 'login failed' }, { status: 500 });
  }
}
