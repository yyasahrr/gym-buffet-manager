import { describe, it, expect } from 'vitest';
import {
  hasPerm,
  ROLE_PERMISSIONS,
  viewableBooks,
  canViewBook,
  PAGE_PERMISSIONS,
  requiredPermForPath,
  canAccessPath,
  type ManagementRole,
  type Permission,
} from '@/lib/rbac';

const ALL_ROLES = Object.keys(ROLE_PERMISSIONS) as ManagementRole[];
const BUFFET_ROLES: ManagementRole[] = ['buffet_manager', 'buffet_seller', 'warehouse_manager'];
const GYM_ROLES: ManagementRole[] = [
  'branch_manager',
  'accountant',
  'reception',
  'trainer',
  'hr',
  'it',
  'technician',
  'cleaner',
  'member',
];

describe('RBAC matrix', () => {
  it('every role has dashboard.view and at least one permission', () => {
    for (const role of ALL_ROLES) {
      expect(hasPerm(role, 'dashboard.view')).toBe(true);
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it('super_admin has every permission defined in the system', () => {
    const allPerms = new Set<Permission>();
    for (const role of ALL_ROLES) ROLE_PERMISSIONS[role].forEach((p) => allPerms.add(p));
    for (const p of allPerms) expect(hasPerm('super_admin', p)).toBe(true);
  });

  it('owner can reach finance, users and trainer panel', () => {
    expect(hasPerm('owner', 'finance.view')).toBe(true);
    expect(hasPerm('owner', 'users.view')).toBe(true);
    expect(hasPerm('owner', 'trainer.panel')).toBe(true);
  });

  it('buffet roles cannot reach gym-only permissions', () => {
    for (const r of BUFFET_ROLES) {
      expect(hasPerm(r, 'members.view')).toBe(false);
      expect(hasPerm(r, 'crm.view')).toBe(false);
      expect(hasPerm(r, 'users.view')).toBe(false);
    }
  });

  it('non-buffet gym roles (accountant/reception/trainer/hr/technician/cleaner/member) cannot reach buffet operations', () => {
    const restricted: ManagementRole[] = [
      'accountant',
      'reception',
      'trainer',
      'hr',
      'technician',
      'cleaner',
      'member',
    ];
    for (const r of restricted) {
      expect(hasPerm(r, 'pos.view')).toBe(false);
      expect(hasPerm(r, 'inventory.view')).toBe(false);
      expect(hasPerm(r, 'cashier.view')).toBe(false);
    }
  });

  it('branch_manager oversees the whole branch (gym + buffet ops) by design', () => {
    expect(hasPerm('branch_manager', 'pos.view')).toBe(true);
    expect(hasPerm('branch_manager', 'members.view')).toBe(true);
    expect(hasPerm('branch_manager', 'attendance.view')).toBe(true);
  });
});

describe('book visibility (two-ledger separation)', () => {
  it('owner and super_admin see both books', () => {
    expect([...viewableBooks('super_admin')].sort()).toEqual(['buffet', 'gym']);
    expect([...viewableBooks('owner')].sort()).toEqual(['buffet', 'gym']);
  });

  it('buffet roles see ONLY the buffet book', () => {
    for (const r of BUFFET_ROLES) {
      expect(canViewBook(r, 'buffet')).toBe(true);
      expect(canViewBook(r, 'gym')).toBe(false);
    }
  });

  it('gym roles see ONLY the gym book', () => {
    for (const r of GYM_ROLES) {
      expect(canViewBook(r, 'gym')).toBe(true);
      expect(canViewBook(r, 'buffet')).toBe(false);
    }
  });
});

describe('route → permission map', () => {
  it('known static routes map to the correct permission', () => {
    expect(requiredPermForPath('/pos')).toBe('pos.view');
    expect(requiredPermForPath('/ledgers')).toBe('finance.view');
    expect(requiredPermForPath('/expenses')).toBe('finance.view');
    expect(requiredPermForPath('/users')).toBe('users.view');
    expect(requiredPermForPath('/hrm')).toBe('trainers.view');
    expect(requiredPermForPath('/trainer')).toBe('trainer.panel');
    expect(requiredPermForPath('/cashier')).toBe('cashier.view');
  });

  it('dynamic routes resolve by their static prefix', () => {
    expect(requiredPermForPath('/customers/abc123')).toBe('crm.view');
    expect(requiredPermForPath('/trainers/t-1')).toBe('trainers.view');
  });

  it('exempt in-panel routes require no permission', () => {
    expect(requiredPermForPath('/account')).toBeNull();
    expect(requiredPermForPath('/support')).toBeNull();
  });

  it('every mapped permission is granted to at least one role', () => {
    for (const perm of Object.values(PAGE_PERMISSIONS)) {
      if (!perm) continue;
      expect(ALL_ROLES.some((r) => hasPerm(r, perm))).toBe(true);
    }
  });
});

describe('canAccessPath (end-to-end page access enforcement)', () => {
  it('buffet_manager sees buffet pages but NOT gym pages', () => {
    expect(canAccessPath('buffet_manager', '/pos')).toBe(true);
    expect(canAccessPath('buffet_manager', '/ledgers')).toBe(true);
    expect(canAccessPath('buffet_manager', '/memberships')).toBe(false);
    expect(canAccessPath('buffet_manager', '/hrm')).toBe(false);
    expect(canAccessPath('buffet_manager', '/users')).toBe(false);
  });

  it('accountant sees accounting but NOT buffet operations', () => {
    expect(canAccessPath('accountant', '/expenses')).toBe(true);
    expect(canAccessPath('accountant', '/ledgers')).toBe(true);
    expect(canAccessPath('accountant', '/pos')).toBe(false);
    expect(canAccessPath('accountant', '/products')).toBe(false);
  });

  it('trainer sees trainer panel + bookings but NOT users/finance', () => {
    expect(canAccessPath('trainer', '/trainer')).toBe(true);
    expect(canAccessPath('trainer', '/booking')).toBe(true);
    expect(canAccessPath('trainer', '/users')).toBe(false);
    expect(canAccessPath('trainer', '/ledgers')).toBe(false);
  });

  it('super_admin can access every mapped route', () => {
    for (const path of Object.keys(PAGE_PERMISSIONS)) {
      expect(canAccessPath('super_admin', path)).toBe(true);
    }
  });

  it('member (portal) is heavily restricted inside management', () => {
    expect(canAccessPath('member', '/dashboard')).toBe(true);
    expect(canAccessPath('member', '/pos')).toBe(false);
    expect(canAccessPath('member', '/users')).toBe(false);
  });

  it('unknown in-panel routes are not hard-locked (allowed)', () => {
    expect(canAccessPath('buffet_manager', '/some/future/page')).toBe(true);
  });
});
