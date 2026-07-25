import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { verifyTenantUser, bootstrapTenant } from '@/server/auth';
import { sha256 } from '@/server/crypto';
import type { AppData, UserAccount } from '@/lib/types';

const TID = 'auth_tenant_' + Date.now();
const dir = path.join(process.cwd(), 'server-data', 'tenants', TID);
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const user: UserAccount = {
  id: 'u1',
  username: 'admin',
  name: 'ادمین',
  role: 'super_admin',
  passwordHash: sha256('1234'),
  active: true,
  createdAt: new Date().toISOString(),
};
const appData = { users: [user] } as unknown as AppData;

describe('server auth', () => {
  it('bootstrap fails with wrong password', () => {
    const r = bootstrapTenant(TID, 'admin', 'wrong', appData);
    expect(r.ok).toBe(false);
  });

  it('bootstrap fails for unknown user', () => {
    const r = bootstrapTenant(TID, 'ghost', '1234', appData);
    expect(r.ok).toBe(false);
  });

  it('bootstrap succeeds then login verifies', () => {
    const r = bootstrapTenant(TID, 'admin', '1234', appData);
    expect(r.ok).toBe(true);
    const u = verifyTenantUser(TID, 'admin', '1234');
    expect(u?.username).toBe('admin');
    expect(verifyTenantUser(TID, 'admin', 'bad')).toBeNull();
    expect(verifyTenantUser(TID, 'nope', '1234')).toBeNull();
  });
});
