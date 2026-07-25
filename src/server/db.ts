import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { emptyDB, type PortalDB, type PortalMember, type PortalInvoice, type Payment, type PortalMembership, type MembershipPlan, type PortalCheckin } from '@/lib/portal-types';

const DATA_DIR = path.join(process.cwd(), 'server-data');
const DB_FILE = path.join(DATA_DIR, 'portal.json');

let cache: PortalDB | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readFile(): PortalDB {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    const db = emptyDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    return db;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      members: parsed.members || [],
      invoices: parsed.invoices || [],
      payments: parsed.payments || [],
      plans: parsed.plans || [],
      memberships: parsed.memberships || [],
    };
  } catch {
    return emptyDB();
  }
}

export function getDB(): PortalDB {
  if (!cache) cache = readFile();
  return cache;
}

export function saveDB(db: PortalDB): void {
  ensureDir();
  cache = db;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function findMemberByToken(token: string): PortalMember | undefined {
  return getDB().members.find((m) => m.portalToken === token);
}

export function findMemberById(id: string): PortalMember | undefined {
  return getDB().members.find((m) => m.id === id);
}

export function findMemberByUsername(username: string): PortalMember | undefined {
  return getDB().members.find((m) => m.username === username);
}

export function findMemberByNationalId(nationalId: string): PortalMember | undefined {
  if (!nationalId) return undefined;
  return getDB().members.find((m) => m.nationalId === nationalId);
}

export function upsertMember(member: PortalMember): PortalMember {
  const db = getDB();
  const idx = db.members.findIndex((m) => m.id === member.id);
  if (idx >= 0) db.members[idx] = { ...db.members[idx], ...member };
  else db.members.push(member);
  saveDB(db);
  return member;
}

export function getInvoicesForMember(memberId: string): PortalInvoice[] {
  return getDB().invoices.filter((i) => i.memberId === memberId);
}

export function findInvoice(id: string): PortalInvoice | undefined {
  return getDB().invoices.find((i) => i.id === id);
}

export function saveInvoice(invoice: PortalInvoice): void {
  const db = getDB();
  const idx = db.invoices.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) db.invoices[idx] = invoice;
  else db.invoices.push(invoice);
  saveDB(db);
}

export function createPayment(payment: Payment): Payment {
  const db = getDB();
  db.payments.push(payment);
  saveDB(db);
  return payment;
}

export function findPaymentByAuthority(authority: string): Payment | undefined {
  return getDB().payments.find((p) => p.authority === authority);
}

export function savePayment(payment: Payment): void {
  const db = getDB();
  const idx = db.payments.findIndex((p) => p.id === payment.id);
  if (idx >= 0) db.payments[idx] = payment;
  else db.payments.push(payment);
  saveDB(db);
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

export function getPlans(): MembershipPlan[] {
  return getDB().plans;
}

export function savePlans(plans: MembershipPlan[]): void {
  const db = getDB();
  db.plans = plans;
  saveDB(db);
}

export function getMemberships(): PortalMembership[] {
  return getDB().memberships;
}

export function findMembership(id: string): PortalMembership | undefined {
  return getDB().memberships.find((m) => m.id === id);
}

export function getMembershipsForMember(memberId: string): PortalMembership[] {
  return getDB().memberships.filter((m) => m.memberId === memberId);
}

export function addMembership(m: PortalMembership): PortalMembership {
  const db = getDB();
  db.memberships.push(m);
  saveDB(db);
  return m;
}

export function getAllMembers(): PortalMember[] {
  return getDB().members;
}

export function addCheckin(checkin: PortalCheckin): PortalCheckin {
  const db = getDB();
  db.checkins.push(checkin);
  saveDB(db);
  return checkin;
}

export function getCheckinsForMember(memberId: string): PortalCheckin[] {
  return getDB().checkins.filter((c) => c.memberId === memberId);
}

export function getTodayCheckins(): PortalCheckin[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const t = start.getTime();
  return getDB().checkins.filter((c) => new Date(c.at).getTime() >= t);
}

export function genToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function makeSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}
