'use client';

import { useEffect, useState } from 'react';
import type { ManagementRole } from './types';

// دسترسی‌های ظریف (Fine-grained permissions) متناظر با ماژول‌ها
export type Permission =
  | 'dashboard.view'
  | 'members.view' | 'members.write'
  | 'crm.view' | 'crm.write'
  | 'trainers.view' | 'trainers.write'
  | 'booking.view' | 'booking.write'
  | 'rental.view' | 'rental.write'
  | 'finance.view' | 'finance.write'
  | 'pos.view' | 'pos.write'
  | 'inventory.view' | 'inventory.write'
  | 'cashier.view'
  | 'reports.view'
  | 'helpdesk.view' | 'helpdesk.write'
  | 'attendance.view' | 'attendance.write'
  | 'users.view' | 'users.write'
  | 'trainer.panel'
  | 'applications.view' | 'applications.write'
  | 'settings.write'
  | 'audit.view'
  | 'portal.view';

// نگاشت نقش → دسترسی‌ها (مطابق سطوح دسترسی سند Enterprise)
export const ROLE_PERMISSIONS: Record<ManagementRole, Permission[]> = {
  super_admin: [
    'dashboard.view', 'members.view', 'members.write', 'crm.view', 'crm.write',
    'trainers.view', 'trainers.write', 'booking.view', 'booking.write', 'rental.view', 'rental.write',
    'finance.view', 'finance.write', 'pos.view', 'pos.write', 'inventory.view', 'inventory.write',
    'cashier.view', 'reports.view', 'helpdesk.view', 'helpdesk.write', 'settings.write', 'audit.view', 'portal.view',
    'attendance.view', 'attendance.write', 'users.view', 'users.write', 'trainer.panel', 'applications.view', 'applications.write',
  ],
  owner: [
    'dashboard.view', 'members.view', 'members.write', 'crm.view', 'crm.write',
    'trainers.view', 'trainers.write', 'booking.view', 'booking.write', 'rental.view', 'rental.write',
    'finance.view', 'finance.write', 'pos.view', 'pos.write', 'inventory.view', 'inventory.write',
    'cashier.view', 'reports.view', 'helpdesk.view', 'helpdesk.write', 'portal.view',
    'attendance.view', 'attendance.write', 'users.view', 'users.write', 'applications.view', 'applications.write', 'trainer.panel',
  ],
  branch_manager: [
    'dashboard.view', 'members.view', 'members.write', 'crm.view', 'crm.write',
    'trainers.view', 'trainers.write', 'booking.view', 'booking.write', 'rental.view', 'rental.write',
    'finance.view', 'finance.write', 'pos.view', 'pos.write', 'inventory.view', 'inventory.write',
    'cashier.view', 'reports.view', 'helpdesk.view', 'helpdesk.write', 'portal.view',
    'attendance.view', 'attendance.write',
  ],
  reception: [
    'dashboard.view', 'members.view', 'members.write', 'crm.view', 'crm.write',
    'booking.view', 'booking.write', 'portal.view', 'helpdesk.view',
    'attendance.view', 'attendance.write',
  ],
  trainer: [
    'dashboard.view', 'members.view', 'booking.view', 'booking.write', 'trainers.view', 'portal.view',
    'attendance.view', 'trainer.panel',
  ],
  member: [
    'dashboard.view', 'booking.view',
  ],
  accountant: [
    'dashboard.view', 'members.view', 'booking.view', 'finance.view', 'finance.write',
    'reports.view', 'audit.view', 'portal.view',
  ],
  buffet_manager: [
    'dashboard.view', 'pos.view', 'pos.write', 'inventory.view', 'inventory.write',
    'cashier.view', 'reports.view', 'finance.view', 'helpdesk.view', 'portal.view',
  ],
  buffet_seller: [
    'dashboard.view', 'pos.view', 'pos.write', 'cashier.view',
  ],
  warehouse_manager: [
    'dashboard.view', 'inventory.view', 'inventory.write', 'reports.view',
  ],
  technician: [
    'dashboard.view', 'helpdesk.view',
  ],
  cleaner: [
    'dashboard.view',
  ],
  hr: [
    'dashboard.view', 'members.view', 'trainers.view', 'trainers.write', 'finance.view', 'reports.view',
    'attendance.view', 'users.view', 'applications.view', 'applications.write',
  ],
  it: [
    'dashboard.view', 'settings.write', 'audit.view', 'reports.view',
    'members.view', 'crm.view', 'trainers.view', 'booking.view', 'rental.view',
    'finance.view', 'pos.view', 'inventory.view', 'cashier.view', 'helpdesk.view', 'portal.view',
    'users.view', 'users.write', 'applications.view', 'applications.write',
  ],
};

export const ROLE_LABELS: Record<ManagementRole, string> = {
  super_admin: 'مدیر کل (Super Admin)',
  owner: 'مالک',
  branch_manager: 'مدیر شعبه',
  reception: 'پذیرش',
  trainer: 'مربی',
  member: 'عضو',
  accountant: 'حسابدار',
  buffet_manager: 'مدیر بوفه',
  buffet_seller: 'فروشنده بوفه',
  warehouse_manager: 'مدیر انبار',
  technician: 'تکنسین',
  cleaner: 'نظافتچی',
  hr: 'منابع انسانی',
  it: 'کارشناس IT',
};

export function hasPerm(role: ManagementRole, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

export function roleLabel(role: ManagementRole): string {
  return ROLE_LABELS[role] ?? role;
}

// --- دیدِ دفتر (بوفه / باشگاه) بر اساس نقش ---
// اصل «دو دفتر»: هر نقش فقط مجاز به مشاهدهٔ دفترِ متعلق به واحد خود است.
// مستأجر/مدیر بوفه دفتر باشگاه را نمی‌بیند و مدیر باشگاه دفتر بوفه را نمی‌بیند.
// فقط مالک و مدیرکل (Super Admin) اجازهٔ دیدن هر دو دفتر را دارند.
export type BookScope = 'gym' | 'buffet';

export function viewableBooks(role: ManagementRole): BookScope[] {
  if (role === 'super_admin' || role === 'owner') return ['gym', 'buffet'];
  if (role === 'buffet_manager' || role === 'buffet_seller' || role === 'warehouse_manager') return ['buffet'];
  return ['gym'];
}

export function canViewBook(role: ManagementRole, book: BookScope): boolean {
  return viewableBooks(role).includes(book);
}

// --- نگاشت مسیر → دسترسی مورد نیاز (برای گارد سطح صفحه) ---
// هر صفحهٔ مدیریت حداقل یک دسترسی می‌خواهد؛ مقدار null یعنی بدون محدودیت درون‌پنلی.
export const PAGE_PERMISSIONS: Record<string, Permission | null> = {
  '/dashboard': 'dashboard.view',
  '/pos': 'pos.view',
  '/orders': 'pos.view',
  '/products': 'inventory.view',
  '/ingredients': 'inventory.view',
  '/purchases': 'inventory.view',
  '/consumables': 'inventory.view',
  '/recipes': 'inventory.view',
  '/waste': 'inventory.view',
  '/reports': 'reports.view',
  '/cashier': 'cashier.view',
  '/memberships': 'members.view',
  '/customers': 'crm.view',
  '/rental': 'rental.view',
  '/booking': 'booking.view',
  '/attendance': 'attendance.view',
  '/trainer': 'trainer.panel',
  '/hrm': 'trainers.view',
  '/trainers': 'trainers.view',
  '/portal-console': 'portal.view',
  '/customer/login': 'portal.view',
  '/expenses': 'finance.view',
  '/ledgers': 'finance.view',
  '/users': 'users.view',
  '/audit': 'audit.view',
  '/help-desk': 'helpdesk.view',
  '/settings': 'settings.write',
  // بدون محدودیت درون‌پنلی (حساب کاربری خود کاربر و صفحهٔ تماس):
  '/account': null,
  '/support': null,
};

// مسیرهای پویا (دارای پارامتر مثل /customers/[id]) با پیشوند ثابت شناسایی می‌شوند.
export function requiredPermForPath(pathname: string): Permission | null {
  if (PAGE_PERMISSIONS[pathname] !== undefined) return PAGE_PERMISSIONS[pathname];
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const two = '/' + parts[0] + '/' + parts[1];
    if (PAGE_PERMISSIONS[two] !== undefined) return PAGE_PERMISSIONS[two];
  }
  const one = '/' + (parts[0] || '');
  if (PAGE_PERMISSIONS[one] !== undefined) return PAGE_PERMISSIONS[one];
  // مسیر ناشناخته درون پنل: برای جلوگیری از قفل‌شدنِ تصادفی، اجازه داده می‌شود.
  return null;
}

export function canAccessPath(role: ManagementRole, pathname: string): boolean {
  const perm = requiredPermForPath(pathname);
  if (!perm) return true;
  return hasPerm(role, perm);
}

// --- نقش فعال (قابل تغییر از طریق سوئیچر نقش، برای پیش‌نمایش هر نقش روی لوکال) ---
export const ACTIVE_ROLE_KEY = 'gym-active-role';
const ROLE_EVENT = 'gbm-role-change';

export function getActiveRole(): ManagementRole {
  if (typeof window === 'undefined') return 'super_admin';
  const stored = localStorage.getItem(ACTIVE_ROLE_KEY) as ManagementRole | null;
  if (stored && ROLE_LABELS[stored]) return stored;
  return 'super_admin';
}

export function setActiveRole(role: ManagementRole): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_ROLE_KEY, role);
  window.dispatchEvent(new Event(ROLE_EVENT));
}

export function clearActiveRole(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_ROLE_KEY);
  window.dispatchEvent(new Event(ROLE_EVENT));
}

export function useActiveRole(): [ManagementRole, (r: ManagementRole) => void] {
  const [role, setRole] = useState<ManagementRole>(getActiveRole());
  useEffect(() => {
    const handler = () => setRole(getActiveRole());
    window.addEventListener(ROLE_EVENT, handler);
    return () => window.removeEventListener(ROLE_EVENT, handler);
  }, []);
  return [role, setActiveRole];
}
