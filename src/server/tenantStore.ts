import fs from 'fs';
import path from 'path';
import type { AppData, UserAccount } from '@/lib/types';

/**
 * لایهٔ دادهٔ سروری (مدل هیبرید): هر «مستأجر/باشگاه» داده‌های خود را در فایلی
 * مجزا نگه می‌دارد. رابط عمداً ساده نگه داشته شده تا بعداً بتوان آن را به
 * Postgres/SQLite تعویض کرد بدون تغییر فراخوان‌ها.
 */
const TENANT_DIR = path.join(process.cwd(), 'server-data', 'tenants');

function tenantFile(tenantId: string): string {
  const safe = String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  return path.join(TENANT_DIR, safe, 'appdata.json');
}

export function tenantExists(tenantId: string): boolean {
  return fs.existsSync(tenantFile(tenantId));
}

export function getTenantAppData(tenantId: string): AppData | null {
  const f = tenantFile(tenantId);
  if (!fs.existsSync(f)) return null;
  try {
    return JSON.parse(fs.readFileSync(f, 'utf-8')) as AppData;
  } catch {
    return null;
  }
}

export function saveTenantAppData(tenantId: string, data: AppData): void {
  const f = tenantFile(tenantId);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(data, null, 2), 'utf-8');
}

export function getTenantUsers(tenantId: string): UserAccount[] {
  return ((getTenantAppData(tenantId)?.users || []) as UserAccount[]) || [];
}
