'use client';

import { useState } from 'react';
import { Copy, ExternalLink, RefreshCw, Link2, Mail, MessageSquare, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppData, dataStore } from '@/lib/store';
import type { MembershipInvoice, Customer } from '@/lib/types';
import { QrCode } from '@/components/portal/qr-code';

export function PortalSyncDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { customers, membershipInvoices, customerTransactions, membershipPlans } = useAppData();
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [link, setLink] = useState('');
  const [loginAvailable, setLoginAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const activeCustomers = (customers || []).filter((c: Customer) => c.status === 'active');

  const sync = async () => {
    if (!customerId) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ابتدا مشتری را انتخاب کنید.' });
      return;
    }
    const custInvoices = (membershipInvoices || []).filter((i: MembershipInvoice) => i.customerId === customerId);
    if (custInvoices.length === 0) {
      // No membership invoices for this customer yet — still publish the plans
      // and create portal access (plans don't require invoices to be visible).
      toast({ title: 'توجه', description: 'این مشتری فاکتور شهریه‌ای ندارد؛ فقط پلن‌ها و دسترسی پورتال بروزرسانی شد.' });
    }
    const cust = activeCustomers.find((c) => c.id === customerId);
    const custTx = (customerTransactions || []).filter((t: any) => t.customerId === customerId);
    const buffetBalance = custTx.reduce((s: number, t: any) => s + (t.type === 'credit' ? t.amount : -t.amount), 0);
    const buffetTransactions = custTx.map((t: any) => ({ id: t.id, date: t.date, type: t.type, amount: t.amount, description: t.description }));
    setBusy(true);
    try {
      const payload = {
        customerId,
        customerName: cust?.name || 'مشتری',
        nationalId: cust?.nationalId,
        lastName: cust?.lastName,
        buffetBalance,
        buffetTransactions,
        plans: membershipPlans,
        username: username || undefined,
        password: password || undefined,
        invoices: custInvoices.map((inv) => ({
          id: inv.id,
          title: inv.title,
          total: inv.total,
          isInstallment: inv.isInstallment,
          status: inv.status,
          installments: inv.installments.map((i) => ({
            id: i.id,
            dueDate: i.dueDate,
            amount: i.amount,
            paid: i.paid,
            paidDate: i.paidDate,
          })),
        })),
      };
      const res = await fetch('/api/portal/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'هم‌سنک ناموفق' });
        return;
      }
      setLink(data.link);
      setLoginAvailable(Boolean(data.loginAvailable));
      toast({ title: 'موفق', description: 'پورتال برای این مشتری آماده شد.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با سرور برقرار نشد' });
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async () => {
    if (!customerId) return;
    const custInvoices = (membershipInvoices || []).filter((i: MembershipInvoice) => i.customerId === customerId);
    if (custInvoices.length === 0) return;
    setUpdating(true);
    try {
      const token = link ? link.replace('/portal/', '') : undefined;
      const res = await fetch('/api/portal/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: custInvoices.map((i) => i.id), token }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'بروزرسانی ناموفق' });
        return;
      }
      const result = data.result || {};
      const updated = (membershipInvoices || []).map((inv: MembershipInvoice) => {
        const r = result[inv.id];
        if (!r) return inv;
        const installments = inv.installments.map((i) => ({ ...i, paid: Boolean(r.installments?.[i.id]) || i.paid }));
        return { ...inv, installments, status: (r.status as MembershipInvoice['status']) || inv.status };
      });
      const patch: any = { membershipInvoices: updated };

      const member = data.member;
      if (member) {
        // Reverse-sync: pull the portal member into the local customer list.
        const localCustomers = (customers || []) as Customer[];
        let cust = member.nationalId ? localCustomers.find((c) => c.nationalId === member.nationalId) : undefined;
        if (!cust) cust = localCustomers.find((c) => c.id === customerId);
        const custId = cust?.id || (member.nationalId ? `cust-${member.nationalId}` : customerId);
        const mergedCustomers = localCustomers.map((c) =>
          c.id === custId
            ? {
                ...c,
                name: member.name || c.name,
                lastName: member.lastName || c.lastName,
                nationalId: member.nationalId || c.nationalId,
                phone: member.phone || c.phone,
                email: member.email || c.email,
                status: c.status || 'active',
              }
            : c
        );
        if (!mergedCustomers.find((c) => c.id === custId)) {
          mergedCustomers.push({
            id: custId,
            name: member.name || 'مشتری',
            status: 'active',
            lastName: member.lastName,
            nationalId: member.nationalId,
            phone: member.phone,
            email: member.email,
          });
        }
        patch.customers = mergedCustomers;

        // Reverse-sync: merge portal buffet transactions into local customer transactions.
        const localTx = (customerTransactions || []).map((t: any) => ({ ...t }));
        const existingIds = new Set(localTx.map((t: any) => t.id));
        const buffetTx = (member.buffetTransactions || [])
          .filter((t: any) => !existingIds.has(t.id))
          .map((t: any) => ({
            id: t.id,
            customerId: custId,
            date: t.date,
            type: t.type,
            amount: t.amount,
            description: t.description,
          }));
        if (buffetTx.length > 0) patch.customerTransactions = [...localTx, ...buffetTx];
      }

      dataStore.saveData(patch);
      toast({ title: 'بروزرسانی شد', description: 'پرداخت‌ها، موجودی بوفه و مشتری با برنامه هم‌سنک شد.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با سرور برقرار نشد' });
    } finally {
      setUpdating(false);
    }
  };

  const copyLink = () => {
    const full = `${window.location.origin}${link}`;
    navigator.clipboard?.writeText(full);
    toast({ title: 'کپی شد', description: full });
  };

  const sendLink = async (channel: 'email' | 'sms' | 'both') => {
    if (!link) return;
    const token = link.replace('/portal/', '');
    setSending(true);
    try {
      const res = await fetch('/api/portal/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, channel, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'ارسال ناموفق' });
        return;
      }
      const r = data.results || {};
      const parts: string[] = [];
      if (r.email) parts.push(`ایمیل: ${r.email.status === 'sent' ? 'ارسال شد' : r.email.status === 'logged' ? 'ثبت شد (لاگ)' : 'ناموفق'}`);
      if (r.sms) parts.push(`پیامک: ${r.sms.status === 'sent' ? 'ارسال شد' : r.sms.status === 'logged' ? 'ثبت شد (لاگ)' : 'ناموفق'}`);
      toast({ title: 'ارسال لینک', description: parts.join(' — ') || 'انجام شد' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با سرور برقرار نشد' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> پورتال پرداخت مشتری</DialogTitle>
          <DialogDescription>مشتری را انتخاب کنید تا پورتال پرداخت شهریه برایش ساخته شود و لینک اختصاصی دریافت کنید.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>مشتری</Label>
            <Select value={customerId} onValueChange={(v) => {
              setCustomerId(v);
              const c = activeCustomers.find((x) => x.id === v);
              setEmail(c?.email || '');
              setPhone(c?.phone || '');
            }}>
              <SelectTrigger><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
              <SelectContent>{activeCustomers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>نام کاربری (اختیاری)</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="برای ورود با رمز" />
            </div>
            <div className="space-y-2">
              <Label>رمز عبور (اختیاری)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="در صورت فعال‌سازی ورود" />
            </div>
          </div>

          {link && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">لینک پورتال اختصاصی:</p>
              <code className="block text-xs break-all bg-muted p-2 rounded">{`${typeof window !== 'undefined' ? window.location.origin : ''}${link}`}</code>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyLink}><Copy className="ml-2 h-4 w-4" /> کپی لینک</Button>
                <Button size="sm" variant="outline" onClick={() => window.open(link, '_blank')}><ExternalLink className="ml-2 h-4 w-4" /> باز کردن</Button>
              </div>
              <div className="flex justify-center pt-1">
                <QrCode value={`${typeof window !== 'undefined' ? window.location.origin : ''}${link}`} />
              </div>
              {loginAvailable && <p className="text-xs text-muted-foreground">ورود با نام کاربری/رمز برای این مشتری فعال است.</p>}
            </div>
          )}

          {link && (
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-sm font-medium">ارسال لینک پرداخت به مشتری</p>
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@domain.com" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>شماره موبایل</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09..." dir="ltr" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => sendLink('email')} disabled={sending}><Mail className="ml-2 h-4 w-4" /> ارسال ایمیل</Button>
                <Button size="sm" variant="outline" onClick={() => sendLink('sms')} disabled={sending}><MessageSquare className="ml-2 h-4 w-4" /> ارسال پیامک</Button>
                <Button size="sm" variant="outline" onClick={() => sendLink('both')} disabled={sending}><Send className="ml-2 h-4 w-4" /> ارسال هر دو</Button>
              </div>
              <p className="text-xs text-muted-foreground">در حالت پیش‌فرض پیام‌ها در سمت سرور ثبت (لاگ) می‌شوند. برای ارسال واقعی، تنظیمات ایمیل/پیامک را در فایل .env فعال کنید.</p>
            </div>
          )}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="secondary" onClick={updateStatus} disabled={updating || !customerId}>
            <RefreshCw className="ml-2 h-4 w-4" /> بروزرسانی پرداخت‌ها و بوفه
          </Button>
          <Button onClick={sync} disabled={busy || !customerId}>
            <Link2 className="ml-2 h-4 w-4" /> ساخت/بروزرسانی پورتال
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
