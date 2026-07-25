'use client';

import { dataStore } from './store';
import type { AppData, ManagementRole, UserAccount } from './types';
import { hasPerm, clearActiveRole, type Permission } from './rbac';
import { logAudit } from './audit';

const SESSION_KEY = 'gym-mgmt-session';
const DATA_KEY = 'gym-canteen-app-data';

export type Session = { role: ManagementRole; name: string; at: number; userId?: string; username?: string };

function readData(): AppData | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(DATA_KEY) || 'null');
  } catch {
    return null;
  }
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Set (or change) the management PIN. Enables auth requirement. */
export async function setManagementPin(pin: string): Promise<void> {
  const salt = Math.random().toString(36).slice(2);
  const hash = await sha256(pin + ':' + salt);
  dataStore.saveData((cur) => ({
    ...cur,
    account: {
      ...cur.account,
      adminPin: hash,
      adminSalt: salt,
      requireManagementAuth: true,
    },
  }));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const data = readData();
  const account = data?.account;
  if (!account?.adminPin) return false;
  const salt = account.adminSalt || '';
  const hash = await sha256(pin + ':' + salt);
  return hash === account.adminPin;
}

/** True when auth is required but no PIN has been configured yet. */
export function authConfigured(): boolean {
  return !!readData()?.account?.adminPin;
}

export function loginSession(role: ManagementRole, name: string, opts?: { userId?: string; username?: string }): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ role, name, at: Date.now(), userId: opts?.userId, username: opts?.username }));
  logAudit('auth.login', `ورود با نقش ${role}`, 'system', name);
}

// ورود با حساب کاربری واقعی (ایجاد شده توسط ادمین)
export function loginAsUser(user: UserAccount): void {
  loginSession(user.role, user.name, { userId: user.id, username: user.username });
}

export function logoutSession(): void {
  const s = getSession();
  localStorage.removeItem(SESSION_KEY);
  clearActiveRole(); // بازنشانی نقش فعال هنگام خروج
  if (s) logAudit('auth.logout', undefined, 'system', s.name);
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function isAuthed(): boolean {
  return !!getSession();
}

// احراز هویت با نام‌کاربری/گذرواژهٔ کاربر واقعی (ایجاد شده توسط ادمین)
export async function authenticate(username: string, password: string): Promise<UserAccount | null> {
  const data = readData();
  const users = (data?.users || []) as UserAccount[];
  const user = users.find((u) => u.username === username && u.active);
  if (!user) return null;
  const hash = await sha256(password);
  if (hash !== user.passwordHash) return null;
  return user;
}

// تغییر گذرواژهٔ کاربر (مثلاً پس از ورود اجباری با رمز پیش‌فرض) و پاک‌سازی پرچم تغییراجباری
export async function changeUserPassword(userId: string, newPassword: string): Promise<void> {
  const data = readData();
  if (!data) return;
  const users = (data.users || []) as UserAccount[];
  const hash = await sha256(newPassword);
  const updated = users.map((u) =>
    u.id === userId ? { ...u, passwordHash: hash, mustChangePassword: false } : u,
  );
  dataStore.saveData({ users: updated });
}

// --- RBAC: بررسی دسترسی بر اساس نقش جلسه فعلی (ماتریس کامل در ./rbac) ---
export function can(permission: Permission): boolean {
  const s = getSession();
  if (!s) return false;
  return hasPerm(s.role, permission);
}
