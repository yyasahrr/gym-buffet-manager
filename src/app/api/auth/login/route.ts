import { NextResponse } from 'next/server';
import { verifyTenantUser } from '@/server/auth';
import { signToken } from '@/server/jwt';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tenantId: string = body.tenantId;
    const username: string = body.username;
    const password: string = body.password;
    if (!tenantId || !username || !password) {
      return NextResponse.json({ error: 'شناسه مستأجر، نام‌کاربری و رمز عبور لازم است.' }, { status: 400 });
    }
    const user = verifyTenantUser(tenantId, username, password);
    if (!user) {
      return NextResponse.json({ error: 'نام‌کاربری یا رمز عبور اشتباه است یا مستأجر ثبت نشده.' }, { status: 401 });
    }
    const token = signToken({ sub: user.id, username: user.username, role: user.role, tenantId });
    return NextResponse.json({ ok: true, token, role: user.role });
  } catch (e) {
    console.error('server login error', e);
    return NextResponse.json({ error: 'خطای سرور در ورود.' }, { status: 500 });
  }
}
