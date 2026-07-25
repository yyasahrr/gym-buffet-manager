import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getTenantAppData, saveTenantAppData, tenantExists, getTenantUsers } from '@/server/tenantStore';
import type { AppData } from '@/lib/types';

const TID = 'test_tenant_' + Date.now();
const dir = path.join(process.cwd(), 'server-data', 'tenants', TID);
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const sample = {
  users: [{ id: 'u1', username: 'admin', name: 'ادمین', role: 'super_admin', passwordHash: 'abc', active: true, createdAt: new Date().toISOString() }],
} as unknown as AppData;

describe('tenantStore', () => {
  it('does not exist before save', () => {
    expect(tenantExists(TID)).toBe(false);
  });

  it('saves and reads back AppData', () => {
    saveTenantAppData(TID, sample);
    expect(tenantExists(TID)).toBe(true);
    const got = getTenantAppData(TID);
    expect(got?.users?.[0]?.username).toBe('admin');
  });

  it('derives users list', () => {
    expect(getTenantUsers(TID).length).toBe(1);
    expect(getTenantUsers(TID)[0].username).toBe('admin');
  });
});
