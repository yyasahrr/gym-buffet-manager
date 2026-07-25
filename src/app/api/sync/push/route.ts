import { NextResponse } from 'next/server';
import type { AppData } from '@/lib/types';
import { getSessionFromRequest } from '@/server/rbac-server';
import { saveTenantAppData } from '@/server/tenantStore';

/** بارگذاری (Push) داده‌های محلی روی سرور — فقط با توکن معتبر همان مستأجر. */
export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'احراز هویت لازم است.' }, { status: 401 });
    }
    const body = await req.json();
    const appData: AppData = body.appData;
    if (!appData) {
      return NextResponse.json({ error: 'داده‌ای ارسال نشده.' }, { status: 400 });
    }
    saveTenantAppData(session.tenantId, appData);
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    console.error('sync push error', e);
    return NextResponse.json({ error: 'خطای سرور در بارگذاری.' }, { status: 500 });
  }
}
