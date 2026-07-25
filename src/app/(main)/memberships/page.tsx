'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  PlusCircle,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { format as formatJalali, parse as parseJalali } from 'date-fns-jalali';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import { useAppData, dataStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { logAudit } from '@/lib/audit';
import { toCSV, downloadCSV } from '@/lib/csv';
import type {
  MembershipPlan,
  Membership,
  MembershipInvoice,
  Installment,
  PlanPeriod,
  PlanCategory,
  Customer,
} from '@/lib/types';
import {
  periodLabels,
  categoryLabels,
  computeEndDate,
  generateInstallmentDates,
  invoicePaid,
  invoiceRemaining,
  computeInvoiceStatus,
  daysUntil,
} from '@/lib/membership';
import { PortalSyncDialog } from '@/components/portal/portal-sync';

const currency = (n: number) => `${(n || 0).toLocaleString('fa-IR')} تومان`;
const jDate = (iso: string) => formatJalali(new Date(iso), 'yyyy/MM/dd');
const jDateTime = (iso: string) => formatJalali(new Date(iso), 'yyyy/MM/dd HH:mm');

const periodOptions: { value: PlanPeriod; label: string }[] = [
  { value: 'monthly', label: 'ماهانه' },
  { value: 'quarterly', label: 'سه‌ماهه' },
  { value: 'semiannual', label: 'شش‌ماهه' },
  { value: 'annual', label: 'سالانه' },
];

export default function MembershipsPage() {
  const { customers, membershipPlans, memberships, membershipInvoices } = useAppData();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [portalOpen, setPortalOpen] = useState(false);
  const [pulling, setPulling] = useState(false);

  useEffect(() => setIsClient(true), []);

  // Auto-pull self-service portal activity into management when the page opens,
  // so payments made via the customer portal appear here without manual action.
  const didAutoPull = useRef(false);
  useEffect(() => {
    if (didAutoPull.current) return;
    didAutoPull.current = true;
    pullPortalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time sync: poll the portal server for changes and re-pull when new
  // activity (payments, check-ins, registrations) is detected. pullPortalData
  // is a hoisted function declaration, so referencing it here is always safe.
  const lastModRef = useRef<number>(0);
  useEffect(() => {
    const tick = async () => {
      try {
        const res = await fetch('/api/portal/poll', { cache: 'no-store' });
        const data = await res.json();
        if (data?.ok && data.lastModified && data.lastModified !== lastModRef.current) {
          lastModRef.current = data.lastModified;
          pullPortalData();
        }
      } catch { /* ignore */ }
    };
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  const exportInvoicesCsv = () => {
    const rows = (membershipInvoices || []).map((inv) => ({
      customer: customerMap.get(inv.customerId)?.name || 'نامشخص',
      title: inv.title,
      issueDate: jDate(inv.issueDate),
      total: inv.total,
      paid: invoicePaid(inv),
      remaining: invoiceRemaining(inv),
      status: computeInvoiceStatus(inv),
    }));
    downloadCSV(`membership-invoices-${new Date().toISOString().split('T')[0]}.csv`, toCSV(rows, [
      { key: 'customer', header: 'مشتری' },
      { key: 'title', header: 'عنوان' },
      { key: 'issueDate', header: 'تاریخ صدور' },
      { key: 'total', header: 'کل' },
      { key: 'paid', header: 'وصولی' },
      { key: 'remaining', header: 'باقی‌مانده' },
      { key: 'status', header: 'وضعیت' },
    ]));
  };

  const customerMap = useMemo(() => new Map<string, Customer>(customers.map((c) => [c.id, c])), [customers]);
  const planMap = useMemo(() => new Map<string, MembershipPlan>(membershipPlans.map((p) => [p.id, p])), [membershipPlans]);
  const activeCustomers = useMemo(() => customers.filter((c) => c.status === 'active'), [customers]);
  const activePlans = useMemo(() => membershipPlans.filter((p) => p.status === 'active'), [membershipPlans]);

  // ---------------- Plans ----------------
  const [planDialog, setPlanDialog] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; plan: MembershipPlan | null }>({ isOpen: false, mode: 'add', plan: null });
  const [planForm, setPlanForm] = useState({ name: '', category: 'regular' as PlanCategory, period: 'monthly' as PlanPeriod, price: '', description: '' });

  const openPlanDialog = (mode: 'add' | 'edit', plan: MembershipPlan | null = null) => {
    if (mode === 'edit' && plan) {
      setPlanForm({ name: plan.name, category: plan.category, period: plan.period, price: String(plan.price), description: plan.description || '' });
    } else {
      setPlanForm({ name: '', category: 'regular', period: 'monthly', price: '', description: '' });
    }
    setPlanDialog({ isOpen: true, mode, plan });
  };
  const closePlanDialog = () => setPlanDialog({ isOpen: false, mode: 'add', plan: null });

  // Publish the current plans to the customer portal server so they appear
  // for customers without needing a per-customer portal sync.
  const pushPlansToPortal = async (plans: MembershipPlan[]) => {
    try {
      const res = await fetch('/api/portal/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans }),
      });
      if (!res.ok) throw new Error('push failed');
      toast({ title: 'بروزرسانی پورتال', description: `${plans.length} پلن با پورتال مشتری هم‌سنک شد.` });
    } catch {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارسال پلن‌ها به پورتال مشتری ناموفق بود.' });
    }
  };

  // Pull self-service portal activity (members, memberships, invoices, plans)
  // back into the management lists so portal payments show up here too.
  // Declared as a hoisted function (rather than a const arrow) so it is always
  // available throughout the component scope, even for the auto-pull effect and
  // the sync ref — eliminating any temporal-dead-zone ReferenceError.
  async function pullPortalData() {
    setPulling(true);
    try {
      const res = await fetch('/api/portal/snapshot');
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'دریافت ناموفق' });
        return;
      }
      const members = (data.members || []) as any[];
      const pMemberships = (data.memberships || []) as any[];
      const pInvoices = (data.invoices || []) as any[];
      const pPlans = (data.plans || []) as any[];

      // 1) Members -> Customers (keep portalMemberId -> customerId mapping)
      const localCustomers = (customers || []) as Customer[];
      const byNat = new Map(localCustomers.map((c): [string | undefined, Customer] => [c.nationalId, c]).filter(([k]) => k));
      const mergedCustomers = [...localCustomers];
      const memberToCustomer: Record<string, string> = {};
      let custAdded = 0;
      for (const m of members) {
        const id = m.nationalId ? `cust-${m.nationalId}` : `portal-cust-${m.id}`;
        const existing = (m.nationalId && byNat.get(m.nationalId)) || mergedCustomers.find((c) => c.id === id);
        const custId = existing?.id || id;
        if (!existing) {
          mergedCustomers.push({ id: custId, name: m.name || 'مشتری', status: 'active', lastName: m.lastName, nationalId: m.nationalId, phone: m.phone, email: m.email });
          custAdded++;
        } else {
          const idx = mergedCustomers.findIndex((c) => c.id === custId);
          if (idx >= 0) {
            mergedCustomers[idx] = {
              ...mergedCustomers[idx],
              name: m.name || mergedCustomers[idx].name,
              lastName: m.lastName || mergedCustomers[idx].lastName,
              nationalId: m.nationalId || mergedCustomers[idx].nationalId,
              phone: m.phone || mergedCustomers[idx].phone,
              email: m.email || mergedCustomers[idx].email,
            };
          }
        }
        memberToCustomer[m.id] = custId;
      }

      // 2) Portal memberships -> management memberships
      const mergedMemberships = [...(memberships || [])] as Membership[];
      let memAdded = 0;
      for (const pm of pMemberships) {
        const customerId = memberToCustomer[pm.memberId];
        if (!customerId) continue;
        const mid = `portal-mem-${pm.id}`;
        const rec: Membership = {
          id: mid,
          customerId,
          planId: pm.planId,
          startDate: pm.startDate,
          endDate: pm.endDate,
          status: (pm.status || 'active') as Membership['status'],
          note: pm.note,
        };
        const idx = mergedMemberships.findIndex((x) => x.id === mid);
        if (idx >= 0) mergedMemberships[idx] = rec;
        else { mergedMemberships.push(rec); memAdded++; }
      }

      // 3) Portal invoices -> management invoices
      const mergedInvoices = [...(membershipInvoices || [])] as MembershipInvoice[];
      let invAdded = 0;
      for (const pi of pInvoices) {
        const customerId = memberToCustomer[pi.memberId];
        if (!customerId) continue;
        const iid = `portal-inv-${pi.id}`;
        const rec: MembershipInvoice = {
          id: iid,
          customerId,
          membershipId: pi.membershipId ? `portal-mem-${pi.membershipId}` : undefined,
          planId: pi.planId,
          title: pi.title,
          issueDate: pi.issueDate || pi.createdAt || new Date().toISOString(),
          total: pi.total,
          isInstallment: pi.isInstallment,
          installments: (pi.installments || []).map((i: any) => ({ id: i.id, dueDate: i.dueDate, amount: i.amount, paid: i.paid, paidDate: i.paidDate })),
          status: (pi.status || 'unpaid') as MembershipInvoice['status'],
          note: '',
        };
        const idx = mergedInvoices.findIndex((x) => x.id === iid);
        if (idx >= 0) mergedInvoices[idx] = rec;
        else { mergedInvoices.push(rec); invAdded++; }
      }

      // 4) Plans (keep in sync with portal)
      const mergedPlans = [...(membershipPlans || [])] as MembershipPlan[];
      const planIds = new Set(mergedPlans.map((p) => p.id));
      for (const p of pPlans) if (!planIds.has(p.id)) mergedPlans.push({ ...(p as MembershipPlan), status: (p.status || 'active') as MembershipPlan['status'] });

      dataStore.saveData({ customers: mergedCustomers, memberships: mergedMemberships, membershipInvoices: mergedInvoices, membershipPlans: mergedPlans });
      toast({ title: 'بروزرسانی شد', description: `${custAdded} مشتری، ${memAdded} عضویت و ${invAdded} فاکتور از پورتال افزوده شد.` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با سرور برقرار نشد' });
    } finally {
      setPulling(false);
    }
  }

  const savePlan = () => {
    const price = parseFloat(planForm.price);
    if (!planForm.name || isNaN(price) || price < 0) {
      toast({ variant: 'destructive', title: 'خطا', description: 'لطفاً نام و مبلغ معتبر وارد کنید.' });
      return;
    }
    if (planDialog.mode === 'add') {
      const newPlan: MembershipPlan = { id: `plan-${Date.now()}`, name: planForm.name, category: planForm.category, period: planForm.period, price, description: planForm.description, status: 'active' };
      const next = [...membershipPlans, newPlan];
      dataStore.saveData({ membershipPlans: next });
      pushPlansToPortal(next);
      logAudit('plan.created', `پلن ${newPlan.name}`, 'gym');
      toast({ title: 'موفق', description: `پلن «${newPlan.name}» اضافه شد.` });
    } else if (planDialog.plan) {
      const updated = membershipPlans.map((p) => (p.id === planDialog.plan!.id ? { ...p, name: planForm.name, category: planForm.category, period: planForm.period, price, description: planForm.description } : p));
      dataStore.saveData({ membershipPlans: updated });
      pushPlansToPortal(updated);
      logAudit('plan.updated', `پلن ${planForm.name}`, 'gym');
      toast({ title: 'موفق', description: 'پلن ویرایش شد.' });
    }
    closePlanDialog();
  };
  const archivePlan = (id: string, archive: boolean) => {
    const next = membershipPlans.map((p) => (p.id === id ? { ...p, status: (archive ? 'archived' : 'active') as MembershipPlan['status'] } : p)) as MembershipPlan[];
    dataStore.saveData({ membershipPlans: next });
    pushPlansToPortal(next);
    logAudit('plan.archived', `بایگانی/بازیابی پلن ${membershipPlans.find((p) => p.id === id)?.name || ''}`, 'gym');
    setOpenMenuId(null);
  };
  const deletePlan = (id: string) => {
    const next = membershipPlans.filter((p) => p.id !== id) as MembershipPlan[];
    dataStore.saveData({ membershipPlans: next });
    pushPlansToPortal(next);
    setOpenMenuId(null);
  };

  // ---------------- Memberships ----------------
  const [memDialog, setMemDialog] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; mem: Membership | null }>({ isOpen: false, mode: 'add', mem: null });
  const [memForm, setMemForm] = useState({ customerId: '', planId: '', startDate: new Date().toISOString(), note: '' });

  const openMemDialog = (mode: 'add' | 'edit', mem: Membership | null = null) => {
    if (mode === 'edit' && mem) {
      setMemForm({ customerId: mem.customerId, planId: mem.planId, startDate: mem.startDate, note: mem.note || '' });
    } else {
      setMemForm({ customerId: '', planId: activePlans[0]?.id || '', startDate: new Date().toISOString(), note: '' });
    }
    setMemDialog({ isOpen: true, mode, mem });
  };
  const closeMemDialog = () => setMemDialog({ isOpen: false, mode: 'add', mem: null });
  const selectedMemPlan = planMap.get(memForm.planId);
  const memEndDate = useMemo(() => (selectedMemPlan ? computeEndDate(memForm.startDate, selectedMemPlan.period) : memForm.startDate), [memForm.startDate, selectedMemPlan]);

  const saveMembership = () => {
    if (!memForm.customerId || !memForm.planId || !selectedMemPlan) {
      toast({ variant: 'destructive', title: 'خطا', description: 'لطفاً مشتری و پلن را انتخاب کنید.' });
      return;
    }
    const endDate = computeEndDate(memForm.startDate, selectedMemPlan.period);
    if (memDialog.mode === 'add') {
      const newMem: Membership = { id: `mem-${Date.now()}`, customerId: memForm.customerId, planId: memForm.planId, startDate: memForm.startDate, endDate, status: 'active', note: memForm.note };
      dataStore.saveData({ memberships: [...memberships, newMem] });
      logAudit('membership.created', `عضویت ${planMap.get(memForm.planId)?.name || ''} برای ${customerMap.get(memForm.customerId)?.name || ''}`, 'gym');
      toast({ title: 'موفق', description: 'عضویت ثبت شد.' });
    } else if (memDialog.mem) {
      const updated = memberships.map((m) => (m.id === memDialog.mem!.id ? { ...m, customerId: memForm.customerId, planId: memForm.planId, startDate: memForm.startDate, endDate, note: memForm.note } : m));
      dataStore.saveData({ memberships: updated });
      toast({ title: 'موفق', description: 'عضویت ویرایش شد.' });
    }
    closeMemDialog();
  };
  const renewMembership = (mem: Membership) => {
    const plan = planMap.get(mem.planId);
    if (!plan) return;
    const newEnd = computeEndDate(mem.endDate, plan.period);
    dataStore.saveData({ memberships: memberships.map((m) => (m.id === mem.id ? { ...m, endDate: newEnd, status: 'active' } : m)) });
    logAudit('membership.renewed', `تمدید عضویت ${customerMap.get(mem.customerId)?.name || ''}`, 'gym');
    toast({ title: 'تمدید شد', description: `عضویت تا ${jDate(newEnd)} تمدید شد.` });
    setOpenMenuId(null);
  };
  const setMemStatus = (id: string, status: Membership['status']) => {
    dataStore.saveData({ memberships: memberships.map((m) => (m.id === id ? { ...m, status } : m)) });
    setOpenMenuId(null);
  };
  const deleteMembership = (id: string) => {
    dataStore.saveData({ memberships: memberships.filter((m) => m.id !== id) });
    setOpenMenuId(null);
  };

  const expiringSoon = useMemo(() => memberships.filter((m) => m.status === 'active' && daysUntil(m.endDate) >= 0 && daysUntil(m.endDate) <= 7), [memberships]);
  const expired = useMemo(() => memberships.filter((m) => m.status === 'active' && daysUntil(m.endDate) < 0), [memberships]);

  // ---------------- Invoices ----------------
  const [invDialog, setInvDialog] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; inv: MembershipInvoice | null }>({ isOpen: false, mode: 'add', inv: null });
  const [invForm, setInvForm] = useState({ customerId: '', membershipId: '', title: '', issueDate: new Date().toISOString(), total: '', isInstallment: false, paidFull: false });
  const [installmentRows, setInstallmentRows] = useState<{ id: string; dueDate: string; amount: number; paid: boolean; paidDate?: string }[]>([]);
  const [instCount, setInstCount] = useState(2);

  const openInvDialog = (mode: 'add' | 'edit', inv: MembershipInvoice | null = null) => {
    if (mode === 'edit' && inv) {
      setInvForm({ customerId: inv.customerId, membershipId: inv.membershipId || '', title: inv.title, issueDate: inv.issueDate, total: String(inv.total), isInstallment: inv.isInstallment, paidFull: inv.status === 'paid' });
      setInstallmentRows(inv.installments.map((i) => ({ id: i.id, dueDate: i.dueDate, amount: i.amount, paid: i.paid, paidDate: i.paidDate })));
    } else {
      setInvForm({ customerId: '', membershipId: '', title: '', issueDate: new Date().toISOString(), total: '', isInstallment: false, paidFull: false });
      setInstallmentRows([]);
      setInstCount(2);
    }
    setInvDialog({ isOpen: true, mode, inv });
  };
  const closeInvDialog = () => setInvDialog({ isOpen: false, mode: 'add', inv: null });

  const selectedInvPlan = useMemo(() => {
    const mem = memberships.find((m) => m.id === invForm.membershipId);
    return mem ? planMap.get(mem.planId) : undefined;
  }, [invForm.membershipId, memberships, planMap]);

  const generateInstallments = () => {
    const total = parseFloat(invForm.total) || 0;
    const count = Math.max(1, Math.floor(instCount));
    const isPrivate = selectedInvPlan?.category === 'private';
    const dates = generateInstallmentDates(count, invForm.issueDate, isPrivate);
    const base = Math.floor(total / count);
    const rows = dates.map((d, i) => ({
      id: `inst-${Date.now()}-${i}`,
      dueDate: d,
      amount: i === count - 1 ? total - base * (count - 1) : base,
      paid: false,
    }));
    setInstallmentRows(rows);
  };

  const saveInvoice = () => {
    const total = parseFloat(invForm.total) || 0;
    if (!invForm.customerId || !invForm.title || total <= 0) {
      toast({ variant: 'destructive', title: 'خطا', description: 'لطفاً مشتری، عنوان و مبلغ معتبر وارد کنید.' });
      return;
    }
    if (invForm.isInstallment) {
      const sum = installmentRows.reduce((s, r) => s + (r.amount || 0), 0);
      if (Math.abs(sum - total) > 1) {
        toast({ variant: 'destructive', title: 'خطا', description: 'جمع مبالغ اقساط باید برابر مبلغ کل فاکتور باشد.' });
        return;
      }
    }
    const installments: Installment[] = installmentRows.map((r) => ({ id: r.id, dueDate: r.dueDate, amount: r.amount, paid: r.paid, paidDate: r.paidDate }));
    const built: MembershipInvoice = {
      id: invDialog.inv?.id || `inv-${Date.now()}`,
      customerId: invForm.customerId,
      membershipId: invForm.membershipId || undefined,
      planId: selectedInvPlan?.id,
      title: invForm.title,
      issueDate: invForm.issueDate,
      total,
      isInstallment: invForm.isInstallment,
      installments,
      status: invForm.isInstallment ? 'unpaid' : invForm.paidFull ? 'paid' : 'unpaid',
      note: '',
    };
    built.status = computeInvoiceStatus(built);

    if (invDialog.mode === 'add') {
      dataStore.saveData({ membershipInvoices: [...membershipInvoices, built] });
      logAudit('invoice.created', `فاکتور ${built.title} - ${built.total.toLocaleString('fa-IR')} تومان`, 'gym');
      toast({ title: 'موفق', description: 'فاکتور شهریه ثبت شد.' });
    } else {
      dataStore.saveData({ membershipInvoices: membershipInvoices.map((i) => (i.id === built.id ? built : i)) });
      toast({ title: 'موفق', description: 'فاکتور ویرایش شد.' });
    }
    closeInvDialog();
  };
  const deleteInvoice = (id: string) => {
    dataStore.saveData({ membershipInvoices: membershipInvoices.filter((i) => i.id !== id) });
    setOpenMenuId(null);
  };

  // ---------------- Reports ----------------
  const reports = useMemo(() => {
    const totalIssued = membershipInvoices.reduce((s, i) => s + i.total, 0);
    const totalPaid = membershipInvoices.reduce((s, i) => s + invoicePaid(i), 0);
    const totalRemaining = membershipInvoices.reduce((s, i) => s + invoiceRemaining(i), 0);
    const overdue = membershipInvoices.filter((i) => computeInvoiceStatus(i) === 'overdue' || (i.isInstallment ? i.installments.some((ins) => !ins.paid && new Date(ins.dueDate) < new Date()) : false));
    const overdueAmount = overdue.reduce((s, i) => s + invoiceRemaining(i), 0);

    // Monthly collection (last 6 months)
    const now = new Date();
    const months: { key: string; label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({ key, label: formatJalali(d, 'yyyy/MM'), value: 0 });
    }
    const monthIndex = new Map(months.map((m, idx) => [m.key, idx]));
    const addToMonth = (iso: string, amount: number) => {
      const d = new Date(iso);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const idx = monthIndex.get(key);
      if (idx !== undefined) months[idx].value += amount;
    };
    membershipInvoices.forEach((inv) => {
      if (!inv.isInstallment) {
        if (inv.status === 'paid') addToMonth(inv.issueDate, inv.total);
      } else {
        inv.installments.forEach((ins) => { if (ins.paid && ins.paidDate) addToMonth(ins.paidDate, ins.amount); });
      }
    });

    return { totalIssued, totalPaid, totalRemaining, overdue, overdueAmount, months };
  }, [membershipInvoices]);

  // ---------------- Render helpers ----------------
  const DateInput = ({ value, onChange, label }: { value: string; onChange: (iso: string) => void; label: string }) => (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right">{label}</Label>
      <Input
        className="col-span-3"
        value={jDate(value)}
        onChange={(e) => {
          try {
            const parsed = parseJalali(e.target.value, 'yyyy/MM/dd', new Date());
            if (!isNaN(parsed.getTime())) onChange(parsed.toISOString());
          } catch { /* ignore */ }
        }}
      />
    </div>
  );

  if (!isClient) {
    return (
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[]} activeBreadcrumb="عضویت‌ها" />
        <main className="flex-1 p-4 sm:px-6 sm:py-6">
          <PageHeader title="عضویت‌ها و شهریه" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="عضویت‌ها" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="عضویت‌ها و شهریه باشگاه">
          <Button variant="outline" onClick={exportInvoicesCsv}>خروجی CSV</Button>
          <Button variant="outline" onClick={pullPortalData} disabled={pulling}>
            <RefreshCw className={cn('ml-2 h-4 w-4', pulling && 'animate-spin')} /> بروزرسانی از پورتال
          </Button>
          <Button variant="outline" onClick={() => pushPlansToPortal(membershipPlans)}>انتشار پلن‌ها در پورتال</Button>
          <Button variant="outline" onClick={() => setPortalOpen(true)}>پورتال اعضا</Button>
          <Button onClick={() => openPlanDialog('add')}><PlusCircle className="ml-2 h-4 w-4" /> پلن جدید</Button>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
            <TabsTrigger value="plans">تعرفه‌ها</TabsTrigger>
            <TabsTrigger value="memberships">عضویت‌ها</TabsTrigger>
            <TabsTrigger value="invoices">فاکتورهای شهریه</TabsTrigger>
            <TabsTrigger value="reports">گزارش</TabsTrigger>
          </TabsList>

          {/* -------- Plans -------- */}
          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <CardTitle>تعرفه‌ها و پلن‌های عضویت</CardTitle>
                <CardDescription>انواع پلن‌های شهریه (ماهانه، سالانه و ...) را تعریف کنید.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>نام پلن</TableHead>
                      <TableHead>دسته</TableHead>
                      <TableHead>دوره</TableHead>
                      <TableHead>مبلغ (تومان)</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead><span className="sr-only">عملیات</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membershipPlans.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">پلنی تعریف نشده است.</TableCell></TableRow>
                    ) : membershipPlans.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant={p.category === 'private' ? 'default' : 'secondary'}>{categoryLabels[p.category]}</Badge></TableCell>
                        <TableCell>{periodLabels[p.period]}</TableCell>
                        <TableCell>{currency(p.price)}</TableCell>
                        <TableCell>{p.status === 'active' ? 'فعال' : 'بایگانی'}</TableCell>
                        <TableCell className="text-left">
                          <DropdownMenu open={openMenuId === p.id} onOpenChange={(o) => setOpenMenuId(o ? p.id : null)}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openPlanDialog('edit', p)}><Pencil className="ml-2 h-4 w-4" /> ویرایش</DropdownMenuItem>
                              {p.status === 'active' ? (
                                <DropdownMenuItem onClick={() => archivePlan(p.id, true)}><Archive className="ml-2 h-4 w-4" /> بایگانی</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => archivePlan(p.id, false)}><ArchiveRestore className="ml-2 h-4 w-4" /> بازیابی</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>حذف پلن؟</AlertDialogTitle>
                                    <AlertDialogDescription>این پلن حذف می‌شود. فاکتورها و عضویت‌های قبلی به قوت خود باقی می‌مانند.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>لغو</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deletePlan(p.id)}>حذف</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------- Memberships -------- */}
          <TabsContent value="memberships">
            {(expired.length > 0 || expiringSoon.length > 0) && (
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                {expiringSoon.length > 0 && (
                  <Card className="border-amber-500">
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="h-5 w-5" /> نزدیک به انقضا ({expiringSoon.length})</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {expiringSoon.slice(0, 5).map((m) => (
                        <p key={m.id}>{customerMap.get(m.customerId)?.name || 'نامشخص'} — {daysUntil(m.endDate)} روز باقی‌مانده</p>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {expired.length > 0 && (
                  <Card className="border-destructive">
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> منقضی‌شده ({expired.length})</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {expired.slice(0, 5).map((m) => (
                        <p key={m.id}>{customerMap.get(m.customerId)?.name || 'نامشخص'} — پایان {jDate(m.endDate)}</p>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>عضویت‌های اعضا</CardTitle>
                <CardDescription>ثبت و مدیریت عضویت مشتریان در پلن‌های تعریف شده.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>مشتری</TableHead>
                      <TableHead>پلن</TableHead>
                      <TableHead>شروع</TableHead>
                      <TableHead>پایان</TableHead>
                      <TableHead>روزهای باقی‌مانده</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead><span className="sr-only">عملیات</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberships.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">عضویتی ثبت نشده است.</TableCell></TableRow>
                    ) : memberships.map((m) => {
                      const days = daysUntil(m.endDate);
                      const isExpired = m.status === 'active' && days < 0;
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{customerMap.get(m.customerId)?.name || 'نامشخص'}</TableCell>
                          <TableCell>{planMap.get(m.planId)?.name || 'نامشخص'}</TableCell>
                          <TableCell>{jDate(m.startDate)}</TableCell>
                          <TableCell>{jDate(m.endDate)}</TableCell>
                          <TableCell className={cn(days < 0 ? 'text-destructive' : days <= 7 ? 'text-amber-600' : '')}>{isExpired ? 'منقضی' : `${days} روز`}</TableCell>
                          <TableCell>
                            <Badge variant={m.status === 'active' ? 'default' : m.status === 'paused' ? 'secondary' : 'destructive'}>
                              {m.status === 'active' ? 'فعال' : m.status === 'paused' ? 'تعلیق' : m.status === 'cancelled' ? 'لغو' : 'منقضی'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">
                            <DropdownMenu open={openMenuId === m.id} onOpenChange={(o) => setOpenMenuId(o ? m.id : null)}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openMemDialog('edit', m)}><Pencil className="ml-2 h-4 w-4" /> ویرایش</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => renewMembership(m)}><CalendarCheck className="ml-2 h-4 w-4" /> تمدید</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setMemStatus(m.id, 'paused')}><AlertTriangle className="ml-2 h-4 w-4" /> تعلیق</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>حذف عضویت؟</AlertDialogTitle>
                                      <AlertDialogDescription>این عضویت حذف می‌شود. فاکتورهای شهریه مرتبط پابرجا می‌مانند.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>لغو</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMembership(m.id)}>حذف</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => openMemDialog('add')}><PlusCircle className="ml-2 h-4 w-4" /> ثبت عضویت جدید</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* -------- Invoices -------- */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>فاکتورهای شهریه</CardTitle>
                <CardDescription>صدور فاکتور شهریه و پیگیری پرداخت (یکجا یا اقساط).</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>مشتری</TableHead>
                      <TableHead>عنوان</TableHead>
                      <TableHead>تاریخ صدور</TableHead>
                      <TableHead>مبلغ کل</TableHead>
                      <TableHead>وصولی</TableHead>
                      <TableHead>باقی‌مانده</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead><span className="sr-only">عملیات</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membershipInvoices.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">فاکتوری صادر نشده است.</TableCell></TableRow>
                    ) : membershipInvoices.map((inv) => {
                      const status = computeInvoiceStatus(inv);
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{customerMap.get(inv.customerId)?.name || 'نامشخص'}</TableCell>
                          <TableCell>{inv.title}</TableCell>
                          <TableCell>{jDate(inv.issueDate)}</TableCell>
                          <TableCell>{currency(inv.total)}</TableCell>
                          <TableCell className="text-green-600">{currency(invoicePaid(inv))}</TableCell>
                          <TableCell className={cn(invoiceRemaining(inv) > 0 ? 'text-destructive' : '')}>{currency(invoiceRemaining(inv))}</TableCell>
                          <TableCell>
                            <Badge variant={status === 'paid' ? 'default' : status === 'overdue' ? 'destructive' : status === 'partial' ? 'secondary' : 'outline'}>
                              {status === 'paid' ? 'پرداخت‌شده' : status === 'overdue' ? 'سررسید گذشته' : status === 'partial' ? 'پرداخت جزئی' : 'پرداخت نشده'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">
                            <DropdownMenu open={openMenuId === inv.id} onOpenChange={(o) => setOpenMenuId(o ? inv.id : null)}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openInvDialog('edit', inv)}><Pencil className="ml-2 h-4 w-4" /> ویرایش / ثبت پرداخت</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>حذف فاکتور؟</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>لغو</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteInvoice(inv.id)}>حذف</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => openInvDialog('add')}><PlusCircle className="ml-2 h-4 w-4" /> صدور فاکتور شهریه</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* -------- Reports -------- */}
          <TabsContent value="reports">
            <div className="grid gap-4 md:grid-cols-4 mb-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">کل صادر شده</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{currency(reports.totalIssued)}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">وصولی</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{currency(reports.totalPaid)}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">باقی‌مانده</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{currency(reports.totalRemaining)}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">سررسید گذشته</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{currency(reports.overdueAmount)}</p></CardContent></Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>نمودار وصولی ماهانه</CardTitle><CardDescription>جمع مبالغ پرداخت‌شده در ۶ ماه اخیر.</CardDescription></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={reports.months}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toLocaleString('fa-IR')}k`} />
                      <Tooltip formatter={(v: number) => currency(v)} />
                      <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>بدهی‌های سررسید گذشته</CardTitle><CardDescription>فاکتورهای دارای قسط یا مبلغ پرداخت‌نشده با سررسید گذشته.</CardDescription></CardHeader>
                <CardContent>
                  {reports.overdue.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">بدهی سررسید گذشته‌ای وجود ندارد.</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>مشتری</TableHead><TableHead>عنوان</TableHead><TableHead>باقی‌مانده</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {reports.overdue.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell>{customerMap.get(inv.customerId)?.name || 'نامشخص'}</TableCell>
                            <TableCell>{inv.title}</TableCell>
                            <TableCell className="text-destructive">{currency(invoiceRemaining(inv))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Plan Dialog */}
      <Dialog open={planDialog.isOpen} onOpenChange={(o) => !o && closePlanDialog()}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{planDialog.mode === 'add' ? 'پلن جدید' : 'ویرایش پلن'}</DialogTitle>
            <DialogDescription>مشخصات تعرفه عضویت را وارد کنید.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">نام پلن</Label>
              <Input className="col-span-3" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">دسته</Label>
              <Select value={planForm.category} onValueChange={(v) => setPlanForm({ ...planForm, category: v as PlanCategory })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">عادی</SelectItem>
                  <SelectItem value="private">خصوصی (اقساط در ۱ و ۱۵ ماه)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">دوره</Label>
              <Select value={planForm.period} onValueChange={(v) => setPlanForm({ ...planForm, period: v as PlanPeriod })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periodOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">مبلغ (تومان)</Label>
              <Input className="col-span-3" type="number" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">توضیحات</Label>
              <Textarea className="col-span-3" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={closePlanDialog}>لغو</Button>
            <Button onClick={savePlan}>ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Membership Dialog */}
      <Dialog open={memDialog.isOpen} onOpenChange={(o) => !o && closeMemDialog()}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{memDialog.mode === 'add' ? 'ثبت عضویت' : 'ویرایش عضویت'}</DialogTitle>
            <DialogDescription>انتساب پلن به مشتری و تعیین دوره عضویت.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">مشتری</Label>
              <Select value={memForm.customerId} onValueChange={(v) => setMemForm({ ...memForm, customerId: v })}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
                <SelectContent>{activeCustomers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">پلن</Label>
              <Select value={memForm.planId} onValueChange={(v) => setMemForm({ ...memForm, planId: v })}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="انتخاب پلن" /></SelectTrigger>
                <SelectContent>{activePlans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({periodLabels[p.period]})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DateInput label="تاریخ شروع" value={memForm.startDate} onChange={(iso) => setMemForm({ ...memForm, startDate: iso })} />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">پایان (خودکار)</Label>
              <div className="col-span-3 text-sm font-medium">{jDate(memEndDate)}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">یادداشت</Label>
              <Textarea className="col-span-3" value={memForm.note} onChange={(e) => setMemForm({ ...memForm, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={closeMemDialog}>لغو</Button>
            <Button onClick={saveMembership}>ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={invDialog.isOpen} onOpenChange={(o) => !o && closeInvDialog()}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{invDialog.mode === 'add' ? 'صدور فاکتور شهریه' : 'ویرایش فاکتور / ثبت پرداخت'}</DialogTitle>
            <DialogDescription>مبلغ شهریه را ثبت کنید و در صورت نیاز به اقساط تبدیل نمایید.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">مشتری</Label>
              <Select value={invForm.customerId} onValueChange={(v) => setInvForm({ ...invForm, customerId: v, membershipId: '' })}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
                <SelectContent>{activeCustomers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {activeCustomers.find((c) => c.id === invForm.customerId) && memberships.some((m) => m.customerId === invForm.customerId) && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">عضویت</Label>
                <Select value={invForm.membershipId} onValueChange={(v) => setInvForm({ ...invForm, membershipId: v })}>
                  <SelectTrigger className="col-span-3"><SelectValue placeholder="انتخاب عضویت (اختیاری)" /></SelectTrigger>
                  <SelectContent>{memberships.filter((m) => m.customerId === invForm.customerId).map((m) => <SelectItem key={m.id} value={m.id}>{planMap.get(m.planId)?.name || 'پلن'}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">عنوان</Label>
              <Input className="col-span-3" value={invForm.title} onChange={(e) => setInvForm({ ...invForm, title: e.target.value })} placeholder="مثال: شهریه ماهانه - مرداد ۱۴۰۴" />
            </div>
            <DateInput label="تاریخ صدور" value={invForm.issueDate} onChange={(iso) => setInvForm({ ...invForm, issueDate: iso })} />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">مبلغ کل (تومان)</Label>
              <Input className="col-span-3" type="number" value={invForm.total} onChange={(e) => setInvForm({ ...invForm, total: e.target.value })} />
            </div>

            {!invForm.isInstallment ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={invForm.paidFull} onChange={(e) => setInvForm({ ...invForm, paidFull: e.target.checked })} />
                پرداخت کامل انجام شد
              </label>
            ) : (
              <div className="space-y-3 border rounded-md p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label>تعداد اقساط</Label>
                    <Input type="number" min={1} value={instCount} onChange={(e) => setInstCount(parseInt(e.target.value) || 1)} />
                  </div>
                  <Button type="button" variant="outline" onClick={generateInstallments}>
                    {selectedInvPlan?.category === 'private' ? 'تولید (۱ و ۱۵ ماه)' : 'تولید اقساط'}
                  </Button>
                </div>
                {installmentRows.length > 0 && (
                  <div className="space-y-2">
                    {installmentRows.map((row, idx) => (
                      <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-1 text-xs text-muted-foreground">{idx + 1}</span>
                        <Input className="col-span-4" type="number" value={row.amount} onChange={(e) => setInstallmentRows((rs) => rs.map((r, i) => i === idx ? { ...r, amount: parseFloat(e.target.value) || 0 } : r))} />
                        <Input className="col-span-4" value={jDate(row.dueDate)} onChange={(e) => { try { const p = parseJalali(e.target.value, 'yyyy/MM/dd', new Date()); if (!isNaN(p.getTime())) setInstallmentRows((rs) => rs.map((r, i) => i === idx ? { ...r, dueDate: p.toISOString() } : r)); } catch { /* */ } }} />
                        <label className="col-span-3 flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={row.paid} onChange={(e) => setInstallmentRows((rs) => rs.map((r, i) => i === idx ? { ...r, paid: e.target.checked, paidDate: e.target.checked ? new Date().toISOString() : undefined } : r))} />
                          پرداخت شد
                        </label>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">جمع اقساط: {currency(installmentRows.reduce((s, r) => s + (r.amount || 0), 0))}</p>
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={invForm.isInstallment} onChange={(e) => setInvForm({ ...invForm, isInstallment: e.target.checked })} />
              پرداخت به صورت اقساطی {selectedInvPlan?.category === 'private' && <span className="text-muted-foreground">(پلن خصوصی: سررسیدهای ۱ و ۱۵ ماه)</span>}
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={closeInvDialog}>لغو</Button>
            <Button onClick={saveInvoice}>ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PortalSyncDialog open={portalOpen} onOpenChange={setPortalOpen} />
    </div>
  );
}
