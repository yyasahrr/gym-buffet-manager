'use client';

import type { AppData } from '@/lib/types';

const SESSION_KEY = 'gym-sync-session';

export interface SyncSession {
  tenantId: string;
  username: string;
  token: string;
  server: string;
}

export function getSyncSession(): SyncSession | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setSyncSession(s: SyncSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSyncSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

async function serverUrl(server: string): Promise<string> {
  const base = server && server.trim() ? server.trim().replace(/\/$/, '') : '';
  return base; // خالی = همین اوریجین (نسخهٔ دسکتاپ/وب)
}

async function postJson(url: string, body: unknown, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `خطای سرور (${res.status})`);
  return data;
}

/** ثبت اولیهٔ مستأجر روی سرور + دریافت توکن. */
export async function bootstrap(
  tenantId: string,
  username: string,
  password: string,
  appData: AppData,
  server = '',
): Promise<SyncSession> {
  const base = await serverUrl(server);
  const data = await postJson(`${base}/api/sync/bootstrap`, { tenantId, username, password, appData });
  const session: SyncSession = { tenantId, username, token: data.token, server };
  setSyncSession(session);
  return session;
}

/** ورود به سرور و دریافت توکن. */
export async function login(
  tenantId: string,
  username: string,
  password: string,
  server = '',
): Promise<SyncSession> {
  const base = await serverUrl(server);
  const data = await postJson(`${base}/api/auth/login`, { tenantId, username, password });
  const session: SyncSession = { tenantId, username, token: data.token, server };
  setSyncSession(session);
  return session;
}

/** بارگذاری داده‌های محلی روی سرور. */
export async function push(appData: AppData): Promise<void> {
  const s = getSyncSession();
  if (!s) throw new Error('ابتدا وارد سرور شوید یا ثبت اولیه کنید.');
  const base = await serverUrl(s.server);
  await postJson(`${base}/api/sync/push`, { appData }, s.token);
}

/** دریافت آخرین داده‌های سرور. */
export async function pull(): Promise<AppData> {
  const s = getSyncSession();
  if (!s) throw new Error('ابتدا وارد سرور شوید یا ثبت اولیه کنید.');
  const base = await serverUrl(s.server);
  const res = await fetch(`${base}/api/sync/pull`, {
    headers: { Authorization: `Bearer ${s.token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `خطای سرور (${res.status})`);
  return data.appData as AppData;
}
