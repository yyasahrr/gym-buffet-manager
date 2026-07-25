import type { AppData, UserAccount } from '@/lib/types';
import { sha256 } from './crypto';
import { getTenantAppData, getTenantUsers, saveTenantAppData, tenantExists } from './tenantStore';

/** بررسی نام‌کاربری/رمز در داده‌های سروریِ یک مستأجر. */
export function verifyTenantUser(
  tenantId: string,
  username: string,
  password: string,
): UserAccount | null {
  if (!tenantExists(tenantId)) return null;
  const users = getTenantUsers(tenantId);
  const user = users.find((u) => u.username === username && u.active);
  if (!user || !user.passwordHash) return null;
  if (sha256(password) !== user.passwordHash) return null;
  return user;
}

/**
 * ثبت اولیهٔ مستأجر (bootstrap): کاربر را درون AppData ارسالی تأیید می‌کند و
 * کل داده را در سمت سرور ذخیره می‌کند. پس از این، ورود و هم‌سنک با توکن انجام می‌شود.
 */
export function bootstrapTenant(
  tenantId: string,
  username: string,
  password: string,
  appData: AppData,
): { ok: boolean; error?: string } {
  const users = ((appData.users || []) as UserAccount[]) || [];
  const user = users.find((u) => u.username === username && u.active);
  if (!user || !user.passwordHash) return { ok: false, error: 'کاربری با این نام‌کاربری یافت نشد.' };
  if (sha256(password) !== user.passwordHash) return { ok: false, error: 'رمز عبور اشتباه است.' };
  saveTenantAppData(tenantId, appData);
  return { ok: true };
}
