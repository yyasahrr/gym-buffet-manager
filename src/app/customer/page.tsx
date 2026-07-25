'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, CreditCard, Wallet, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, AlertCircle, CalendarCheck, CalendarClock, Timer, Sparkles, ScanLine, ClipboardList, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAppData, dataStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import { QrCode } from '@/components/portal/qr-code';

type Inv = {
  id: string;
  membershipId?: string;
  title: string;
  total: number;
  isInstallment: boolean;
  installments: { id: string; dueDate: string; amount: number; paid: boolean; paidDate?: string }[];
  status: string;
};

type Member = {
  id: string;
  name: string;
  lastName?: string;
  nationalId?: string;
  phone?: string;
  buffetBalance: number;
  buffetTransactions: { id: string; date: string; type: 'credit' | 'debit'; amount: number; description: string }[];
};

const statusLabel: Record<string, string> = {
  paid: 'پرداخت‌شده',
  partial: 'پرداخت جزئی',
  unpaid: 'پرداخت نشده',
  overdue: 'سررسید گذشته',
};

const fmt = (n: number) => `${(n || 0).toLocaleString('fa-IR')} تومان`;
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('fa-IR'); } catch { return iso; }
};

// Whole days from now until the given ISO date (negative if past).
function daysUntil(iso: string, now: Date = new Date()): number {
  const end = new Date(iso).getTime();
  return Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24));
}

type Plan = {
  id: string;
  name: string;
  category: 'private' | 'regular';
  period: string;
  price: number;
  description?: string;
  status?: string;
};

type Mshp = {
  id: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: string;
};

const periodLabel: Record<string, string> = {
  monthly: 'ماهانه',
  quarterly: 'سه‌ماهه',
  semiannual: 'شش‌ماهه',
  annual: 'سالانه',
};
const categoryLabel: Record<string, string> = { private: 'خصوصی', regular: 'عادی' };

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [paying, setPaying] = useState<string | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeBusy, setChargeBusy] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  // برنامه‌ها و پیام‌های مربی از داده‌های محلی (AppData) بر اساس کد ملی عضو استخراج می‌شوند
  const { customers, programs, chatMessages, workoutPlans, nutritionPlans } = useAppData();
  const [reply, setReply] = useState('');
  const localCustomerId = useMemo(() => {
    if (!member?.nationalId) return null;
    const nid = String(member.nationalId).trim();
    const c = (customers || []).find((x) => x.nationalId && String(x.nationalId).trim() === nid);
    return c?.id || null;
  }, [member, customers]);
  const myPrograms = useMemo(
    () => (localCustomerId ? (programs || []).filter((p) => p.memberId === localCustomerId) : []),
    [programs, localCustomerId],
  );
  const myMessages = useMemo(
    () => (localCustomerId ? (chatMessages || []).filter((m) => m.memberId === localCustomerId) : []),
    [chatMessages, localCustomerId],
  );
  const myWorkoutPlans = useMemo(() => localCustomerId ? (workoutPlans || []).filter(p => p.customerId === localCustomerId) : [], [workoutPlans, localCustomerId]);
  const myNutritionPlans = useMemo(() => localCustomerId ? (nutritionPlans || []).filter(p => p.customerId === localCustomerId) : [], [nutritionPlans, localCustomerId]);
  const myTrainerId = myMessages[0]?.trainerId || myPrograms[0]?.trainerId || '';
  const myTrainerName = myMessages[0]?.trainerName || myPrograms[0]?.trainerName || '';
  const [memberships, setMemberships] = useState<Mshp[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const planMap = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

  // Dashboard statistics: active membership remaining days + next installment countdown.
  const stats = useMemo(() => {
    const active = memberships.find((m) => m.status === 'active');
    if (!active) return null;
    const plan = planMap.get(active.planId);
    const remaining = daysUntil(active.endDate);
    let nextInstallment: { dueDate: string; amount: number; days: number } | null = null;
    if (plan?.category === 'private') {
      const inv = invoices.find((i) => i.membershipId === active.id && i.isInstallment);
      const unpaid = inv?.installments.find((i) => !i.paid);
      if (unpaid) {
        nextInstallment = { dueDate: unpaid.dueDate, amount: unpaid.amount, days: daysUntil(unpaid.dueDate) };
      }
    }
    return { plan, remaining, nextInstallment };
  }, [memberships, planMap, invoices]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer/me');
      if (res.status === 401) {
        router.replace('/customer/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'خطا در بارگذاری');
        return;
      }
      setMember(data.member);
      setInvoices(data.invoices || []);
      setMemberships(data.memberships || []);
      try {
        const pr = await fetch('/api/portal/plans');
        const pd = await pr.json();
        if (pr.ok) setPlans(pd.plans || []);
      } catch { /* plans optional */ }
    } catch (e) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') {
      toast({ title: 'پرداخت موفق', description: 'پرداخت شما با موفقیت ثبت شد.' });
    } else if (params.get('paid') === '0') {
      toast({ variant: 'destructive', title: 'پرداخت ناموفق', description: 'عملیات پرداخت لغو یا ناموفق بود.' });
    }
  }, [load, toast]);

  const payInvoice = async (invoiceId: string, installmentId?: string) => {
    setPaying(installmentId || invoiceId);
    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, installmentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'امکان شروع پرداخت نیست' });
        setPaying(null);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با درگاه برقرار نشد' });
      setPaying(null);
    }
  };

  const submitCharge = async () => {
    const amt = parseInt(chargeAmount, 10) || 0;
    if (amt <= 0) {
      toast({ variant: 'destructive', title: 'خطا', description: 'مبلغ معتبر وارد کنید.' });
      return;
    }
    setChargeBusy(true);
    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'buffet', amount: amt }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'امکان شروع پرداخت نیست' });
        setChargeBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با درگاه برقرار نشد' });
      setChargeBusy(false);
    }
  };

  const logout = async () => {
    await fetch('/api/customer/logout', { method: 'POST' });
    router.push('/customer/login');
  };

  const subscribe = async (planId: string) => {
    setActing(planId);
    try {
      const res = await fetch('/api/customer/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.invoiceId) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'ثبت اشتراک ناموفق' });
        setActing(null);
        return;
      }
      toast({ title: 'اشتراک ثبت شد', description: 'فاکتور شهریه ایجاد شد؛ می‌توانید آن را پرداخت کنید.' });
      load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با سرور برقرار نشد' });
      setActing(null);
    }
  };

  const renew = async (membershipId: string) => {
    setActing(membershipId);
    try {
      const res = await fetch('/api/customer/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId }),
      });
      const data = await res.json();
      if (!res.ok || !data.invoiceId) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'تمدید ناموفق' });
        setActing(null);
        return;
      }
      toast({ title: 'تمدید ثبت شد', description: 'فاکتور تمدید ایجاد شد؛ می‌توانید آن را پرداخت کنید.' });
      load();
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با سرور برقرار نشد' });
      setActing(null);
    }
  };

  // Open the plan drawer, subscribe to the chosen plan, then jump straight to
  // the payment gateway. After payment the gateway redirects back to the dashboard.
  const choosePlan = async (planId: string) => {
    setPayingPlanId(planId);
    try {
      const res = await fetch('/api/customer/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.invoiceId) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'ثبت اشتراک ناموفق' });
        setPayingPlanId(null);
        return;
      }
      const pr = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: data.invoiceId }),
      });
      const pd = await pr.json();
      if (!pr.ok || !pd.url) {
        toast({ variant: 'destructive', title: 'خطا', description: pd.error || 'امکان شروع پرداخت نیست' });
        setPayingPlanId(null);
        return;
      }
      window.location.href = pd.url;
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با سرور برقرار نشد' });
      setPayingPlanId(null);
    }
  };

  const sendReply = () => {
    if (!reply.trim() || !localCustomerId) return;
    dataStore.saveData({
      chatMessages: [
        ...(chatMessages || []),
        {
          id: uid('msg'),
          trainerId: myTrainerId,
          trainerName: myTrainerName,
          memberId: localCustomerId,
          memberName: `${member?.name || ''}${member?.lastName ? ' ' + member.lastName : ''}`.trim(),
          from: 'member',
          text: reply.trim(),
          at: new Date().toISOString(),
        },
      ],
    });
    setReply('');
    toast({ title: 'ارسال شد', description: 'پیام شما برای مربی ارسال شد.' });
  };

  if (loading) return <p className="text-center text-muted-foreground py-16">در حال بارگذاری…</p>;
  if (error) return <p className="text-center text-destructive py-16">{error}</p>;
  if (!member) return <p className="text-center text-muted-foreground py-16">عضو یافت نشد.</p>;

  const balance = member.buffetBalance || 0;
  const isDebt = balance < 0;
  const debtAmount = Math.abs(balance);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">داشبورد مشتری</h1>
            <p className="text-muted-foreground">
              {member.name} {member.lastName || ''} {member.nationalId ? `— کد ملی ${member.nationalId}` : ''}
            </p>
          </div>
          <Button variant="outline" onClick={logout}><LogOut className="ml-2 h-4 w-4" /> خروج</Button>
        </div>

        {/* Buffet account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> حساب بوفه باشگاه</CardTitle>
            <CardDescription>موجودی و گردش حساب بوفه شما.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn('text-3xl font-bold', isDebt ? 'text-destructive' : 'text-green-600')}>
              {isDebt ? `${fmt(debtAmount)} بدهکار` : `${fmt(balance)} بستانکار`}
            </div>
            <div className="flex flex-wrap gap-2">
              {isDebt && (
                <Button onClick={() => { setChargeAmount(String(debtAmount)); setChargeOpen(true); }}>
                  <ArrowUpFromLine className="ml-2 h-4 w-4" /> تسویه بدهی ({fmt(debtAmount)})
                </Button>
              )}
              <Button variant={isDebt ? 'outline' : 'default'} onClick={() => { setChargeAmount(''); setChargeOpen(true); }}>
                <ArrowDownToLine className="ml-2 h-4 w-4" /> شارژ حساب
              </Button>
            </div>

            {member.buffetTransactions && member.buffetTransactions.length > 0 ? (
              <div className="space-y-1 pt-2">
                <p className="text-sm font-medium text-muted-foreground">گردش حساب</p>
                {[...member.buffetTransactions].reverse().slice(0, 8).map((t) => (
                  <div key={t.id} className="flex justify-between text-sm border-b py-1">
                    <span>{fmtDate(t.date)} — {t.description}</span>
                    <span className={cn(t.type === 'credit' ? 'text-green-600' : 'text-destructive')}>
                      {t.type === 'credit' ? '+' : '-'}{fmt(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">تراکنشی ثبت نشده است.</p>
            )}
          </CardContent>
        </Card>

        {/* Membership summary stats: remaining days + next installment countdown */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" /> خلاصه اشتراک باشگاه</CardTitle>
              <CardDescription>وضعیت و زمان باقی‌مانده عضویت فعال شما.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-stretch gap-3">
                <div className="flex-1 min-w-[140px] rounded-lg bg-muted px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">پلن فعال</p>
                  <p className="text-lg font-semibold">{stats.plan?.name || '—'}</p>
                </div>
                <div className="flex-1 min-w-[140px] rounded-lg bg-primary/10 px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">روزهای باقی‌مانده</p>
                  <p className={cn('text-3xl font-bold', stats.remaining <= 7 ? 'text-destructive' : 'text-primary')}>
                    {stats.remaining > 0 ? stats.remaining.toLocaleString('fa-IR') : '۰'}
                  </p>
                </div>
                {stats.nextInstallment && (
                  <div className="flex-1 min-w-[160px] rounded-lg bg-amber-100 px-4 py-3 text-center">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><Timer className="h-3 w-3" /> قسط بعدی</p>
                    <p className="text-lg font-semibold">
                      {stats.nextInstallment.days > 0 ? `${stats.nextInstallment.days.toLocaleString('fa-IR')} روز` : 'سررسید شده'}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtDate(stats.nextInstallment.dueDate)} — {fmt(stats.nextInstallment.amount)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trainer programs & messages */}
        {localCustomerId && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> برنامه‌های تمرینی و غذایی</CardTitle>
                <CardDescription>برنامه‌هایی که مربی شما برایتان ارسال کرده است.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {myPrograms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">هنوز برنامه‌ای برای شما ارسال نشده است.</p>
                ) : (
                  myPrograms.map((p) => (
                    <div key={p.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{p.title}</span>
                        <Badge variant={p.type === 'workout' ? 'default' : 'secondary'}>{p.type === 'workout' ? 'تمرینی' : 'غذایی'}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{p.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">مربی: {p.trainerName} — {fmtDate(p.createdAt)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {(myWorkoutPlans.length > 0 || myNutritionPlans.length > 0) && <Card><CardHeader><CardTitle>برنامه‌های اختصاصی جدید</CardTitle><CardDescription>برنامه‌های کامل ارسال‌شده توسط مربی</CardDescription></CardHeader><CardContent className="space-y-2">{myWorkoutPlans.map(p => <div key={p.id} className="rounded border p-3"><b>تمرینی: {p.title}</b><p className="text-sm">سیستم: {p.system || 'عمومی'} — {p.days.flatMap(x => x.exercises).length} حرکت</p><p className="text-sm text-muted-foreground">{p.notes}</p></div>)}{myNutritionPlans.map(p => <div key={p.id} className="rounded border p-3"><b>غذایی: {p.title}</b><p className="text-sm">{p.meals.length} وعده — {p.meals.reduce((s,m) => s + (m.calories || 0), 0)} کالری ثبت‌شده</p><p className="text-sm text-muted-foreground">{p.notes}</p></div>)}</CardContent></Card>}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> پیام‌های مربی</CardTitle>
                <CardDescription>پیام‌ها و راهنمایی‌های مربی شما (و پاسخ شما).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {myMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">پیامی از مربی دریافت نکرده‌اید.</p>
                ) : (
                  [...myMessages].reverse().map((m) => (
                    <div key={m.id} className={`rounded-lg p-3 ${m.from === 'member' ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}`}>
                      <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.from === 'member' ? 'شما' : `مربی: ${m.trainerName}`} — {fmtDate(m.at)}
                      </p>
                    </div>
                  ))
                )}
                {myTrainerId && (
                  <div className="flex gap-2 pt-2">
                    <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="پاسخ به مربی…" className="flex-1" />
                    <Button size="sm" onClick={sendReply} disabled={!reply.trim()}>ارسال</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Membership QR check-in card */}
        {member.portalToken && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ScanLine className="h-5 w-5" /> کارت عضویت (چک‌این)</CardTitle>
              <CardDescription>این کد QR را در ورودی باشگاه اسکن کنید تا حضور شما ثبت شود.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              <QrCode value={`${typeof window !== 'undefined' ? window.location.origin : ''}/checkin?token=${member.portalToken}`} size={160} />
              <p className="text-xs text-muted-foreground">{member.name} {member.lastName || ''}</p>
            </CardContent>
          </Card>
        )}

        {/* Prompt to pick a plan when there is no active membership yet */}
        {!stats && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">هنوز شهریه‌ای انتخاب نکرده‌اید</p>
                  <p className="text-sm text-muted-foreground">نوع اشتراک باشگاه را انتخاب و پرداخت کنید.</p>
                </div>
              </div>
              <Button onClick={() => setPlanDrawerOpen(true)}>
                <Sparkles className="ml-2 h-4 w-4" /> انتخاب و خرید شهریه
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> اشتراک و عضویت باشگاه</CardTitle>
            <CardDescription>خرید اشتراک جدید یا تمدید عضویت فعلی.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {memberships.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">عضویت‌های فعلی</p>
                {memberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <p className="font-medium">{planMap.get(m.planId)?.name || 'پلن'}</p>
                      <p className="text-sm text-muted-foreground">{periodLabel[planMap.get(m.planId)?.period || ''] || ''} — تا {fmtDate(m.endDate)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status === 'active' ? 'فعال' : m.status === 'expired' ? 'منقضی' : m.status}</Badge>
                      {m.status === 'active' && (
                        <Button size="sm" variant="outline" onClick={() => renew(m.id)} disabled={acting === m.id}>تمدید</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">خرید اشتراک جدید</p>
              <Button onClick={() => setPlanDrawerOpen(true)} className="w-full sm:w-auto">
                <Sparkles className="ml-2 h-4 w-4" /> انتخاب نوع شهریه و پرداخت
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tuition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> شهریه‌های من</CardTitle>
            <CardDescription>فاکتورهای شهریه و وضعیت پرداخت.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">فاکتور شهریه‌ای برای شما ثبت نشده است.</p>
            ) : (
              invoices.map((inv) => {
                const paid = inv.installments.reduce((s, i) => s + (i.paid ? i.amount : 0), 0);
                const remaining = Math.max(0, inv.total - paid);
                return (
                  <div key={inv.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{inv.title}</span>
                      <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'overdue' ? 'destructive' : inv.status === 'partial' ? 'secondary' : 'outline'}>
                        {statusLabel[inv.status] || inv.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">کل: {fmt(inv.total)} — باقی‌مانده: <span className={cn(remaining > 0 ? 'text-destructive' : 'text-green-600')}>{fmt(remaining)}</span></p>
                    {inv.isInstallment ? (
                      inv.installments.map((ins) => (
                        <div key={ins.id} className="flex items-center justify-between border rounded-md p-2">
                          <div>
                            <p className="text-sm">قسط — سررسید {fmtDate(ins.dueDate)}</p>
                            <p className="text-sm text-muted-foreground">{fmt(ins.amount)}</p>
                          </div>
                          {ins.paid ? (
                            <Badge variant="default" className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> پرداخت‌شده</Badge>
                          ) : (
                            <Button size="sm" onClick={() => payInvoice(inv.id, ins.id)} disabled={paying === ins.id}>پرداخت قسط</Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between border rounded-md p-2">
                        <p className="text-sm">{fmt(inv.total)}</p>
                        {inv.status === 'paid' ? (
                          <Badge variant="default" className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> پرداخت‌شده</Badge>
                        ) : (
                          <Button size="sm" onClick={() => payInvoice(inv.id)} disabled={paying === inv.id}>پرداخت</Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">مربیان باشگاه</p>
                <p className="text-sm text-muted-foreground">رزومه، شهریه خصوصی و زمان‌های آزاد مربیان را ببینید.</p>
              </div>
            </div>
            <Link href="/trainers"><Button variant="outline">مشاهده مربیان</Button></Link>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <AlertCircle className="h-3 w-3" /> درگاه پرداخت در حالت شبیه‌سازی‌شده (تستی) است.
        </p>
      </div>

      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>شارژ / تسویه حساب بوفه</DialogTitle>
            <DialogDescription>مبلغی که می‌خواهید به حساب بوفه واریز کنید را وارد نمایید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>مبلغ (تومان)</Label>
            <Input type="number" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} placeholder="مثال: 500000" dir="ltr" />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setChargeOpen(false)}>انصراف</Button>
            <Button onClick={submitCharge} disabled={chargeBusy}>پرداخت و ثبت</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan selection drawer (کشویی): pick a tuition type, then pay */}
      <Sheet open={planDrawerOpen} onOpenChange={setPlanDrawerOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> انتخاب نوع شهریه</SheetTitle>
            <SheetDescription>پلن مورد نظر خود را انتخاب کرده و پرداخت را انجام دهید.</SheetDescription>
          </SheetHeader>
          <div className="space-y-2 py-4">
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">در حال حاضر پلنی تعریف نشده است.</p>
            ) : (
              plans.map((p) => (
                <div key={p.id} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <p className="font-medium">{p.name} <Badge variant={p.category === 'private' ? 'default' : 'secondary'}>{categoryLabel[p.category]}</Badge></p>
                    <p className="text-sm text-muted-foreground">{periodLabel[p.period] || p.period} — {fmt(p.price)}</p>
                  </div>
                  <Button size="sm" onClick={() => choosePlan(p.id)} disabled={payingPlanId === p.id}>
                    {payingPlanId === p.id ? 'در حال انتقال…' : 'خرید و پرداخت'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
