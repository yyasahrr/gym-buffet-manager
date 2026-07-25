import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/server/rbac-server';
import { getTenantAppData } from '@/server/tenantStore';

/** دریافت (Pull) آخرین داده‌های سرور برای مستأجر — فقط با توکن معتبر. */
export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'احراز هویت لازم است.' }, { status: 401 });
    }
    const data = getTenantAppData(session.tenantId);
    if (!data) {
      return NextResponse.json({ error: 'داده‌ای برای این مستأجر ثبت نشده.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, appData: data, at: new Date().toISOString() });
  } catch (e) {
    console.error('sync pull error', e);
    return NextResponse.json({ error: 'خطای سرور در دریافت.' }, { status: 500 });
  }
}
