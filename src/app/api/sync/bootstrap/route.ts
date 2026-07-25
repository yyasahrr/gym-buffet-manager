import { NextResponse } from 'next/server';
import type { AppData } from '@/lib/types';
import { bootstrapTenant } from '@/server/auth';
import { signToken } from '@/server/jwt';

/**
 * ثبت اولیهٔ مستأجر روی سرور: کل AppData (شامل کاربران) ارسال می‌شود، تأیید
 * می‌گردد و ذخیره می‌شود؛ سپس توکن برگردانده می‌شود.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tenantId: string = body.tenantId;
    const username: string = body.username;
    const password: string = body.password;
    const appData: AppData = body.appData;
    if (!tenantId || !username || !password || !appData) {
      return NextResponse.json({ error: 'داده‌های ناقص برای ثبت اولیه.' }, { status: 400 });
    }
    const result = bootstrapTenant(tenantId, username, password, appData);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'ثبت ناموفق بود.' }, { status: 401 });
    }
    const users = ((appData.users || []) as { id: string; username: string; role: string }[]) || [];
    const user = users.find((u) => u.username === username);
    const token = signToken({ sub: user?.id, username, role: user?.role, tenantId });
    return NextResponse.json({ ok: true, token });
  } catch (e) {
    console.error('bootstrap error', e);
    return NextResponse.json({ error: 'خطای سرور در ثبت اولیه.' }, { status: 500 });
  }
}
