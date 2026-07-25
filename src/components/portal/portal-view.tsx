'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, CreditCard, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { QrCode } from '@/components/portal/qr-code';

type Inv = {
  id: string;
  title: string;
  total: number;
  isInstallment: boolean;
  installments: { id: string; dueDate: string; amount: number; paid: boolean; paidDate?: string }[];
  status: string;
};

const statusLabel: Record<string, string> = {
  paid: 'پرداخت‌شده',
  partial: 'پرداخت جزئی',
  unpaid: 'پرداخت نشده',
  overdue: 'سررسید گذشته',
};

function fmt(n: number) {
  return `${(n || 0).toLocaleString('fa-IR')} تومان`;
}

export function PortalView({ token }: { token?: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<{ id: string; name: string } | null>(null);
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<string | null>(null);

  const shareLink =
    typeof window !== 'undefined'
      ? token
        ? `${window.location.origin}/portal/${token}`
        : window.location.href
      : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = token ? `/api/portal/member?token=${encodeURIComponent(token)}` : `/api/portal/member`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'خطا در بارگذاری');
        return;
      }
      setMember(data.member);
      setInvoices(data.invoices);
    } catch (e) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') {
      toast({ title: 'پرداخت موفق', description: 'پرداخت شما با موفقیت ثبت شد. از اعتماد شما متشکریم.' });
    } else if (params.get('paid') === '0') {
      toast({ variant: 'destructive', title: 'پرداخت ناموفق', description: 'عملیات پرداخت لغو یا ناموفق بود.' });
    }
  }, [load, toast]);

  const pay = async (invoiceId: string, installmentId?: string) => {
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
        return;
      }
      // Redirect to the (mock) gateway — same flow as a real gateway.
      window.location.href = data.url;
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با درگاه برقرار نشد' });
      setPaying(null);
    }
  };

  if (loading) return <p className="text-center text-muted-foreground py-10">در حال بارگذاری…</p>;
  if (error) return <p className="text-center text-destructive py-10">{error}</p>;
  if (!member) return <p className="text-center text-muted-foreground py-10">عضو یافت نشد.</p>;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">پورتال پرداخت شهریه</h1>
          <p className="text-muted-foreground">خوش آمدید، {member.name} عزیز</p>
        </div>

        {shareLink && (
          <Card>
            <CardContent className="py-4 flex flex-col items-center gap-2">
              <p className="text-sm font-medium">اسکن برای باز کردن پورتال در موبایل</p>
              <QrCode value={shareLink} />
            </CardContent>
          </Card>
        )}

        {invoices.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">فاکتور شهریه‌ای برای شما ثبت نشده است.</CardContent>
          </Card>
        )}

        {invoices.map((inv) => {
          const paid = inv.isInstallment
            ? inv.installments.reduce((s, i) => s + (i.paid ? i.amount : 0), 0)
            : inv.status === 'paid'
              ? inv.total
              : 0;
          const remaining = Math.max(0, inv.total - paid);
          return (
            <Card key={inv.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{inv.title}</CardTitle>
                  <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'overdue' ? 'destructive' : inv.status === 'partial' ? 'secondary' : 'outline'}>
                    {statusLabel[inv.status] || inv.status}
                  </Badge>
                </div>
                <CardDescription>مبلغ کل: {fmt(inv.total)} — باقی‌مانده: <span className={cn(remaining > 0 ? 'text-destructive' : 'text-green-600')}>{fmt(remaining)}</span></CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {inv.isInstallment ? (
                  inv.installments.map((ins) => (
                    <div key={ins.id} className="flex items-center justify-between border rounded-md p-3">
                      <div>
                        <p className="text-sm font-medium">قسط — سررسید {new Date(ins.dueDate).toLocaleDateString('fa-IR')}</p>
                        <p className="text-sm text-muted-foreground">{fmt(ins.amount)}</p>
                      </div>
                      {ins.paid ? (
                        <Badge variant="default" className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> پرداخت‌شده</Badge>
                      ) : (
                        <Button size="sm" onClick={() => pay(inv.id, ins.id)} disabled={paying === ins.id}>
                          <CreditCard className="ml-2 h-4 w-4" /> پرداخت قسط
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <p className="text-sm font-medium">پرداخت کل فاکتور</p>
                      <p className="text-sm text-muted-foreground">{fmt(inv.total)}</p>
                    </div>
                    {inv.status === 'paid' ? (
                      <Badge variant="default" className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> پرداخت‌شده</Badge>
                    ) : (
                      <Button size="sm" onClick={() => pay(inv.id)} disabled={paying === inv.id}>
                        <CreditCard className="ml-2 h-4 w-4" /> پرداخت
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <AlertCircle className="h-3 w-3" /> درگاه پرداخت در حالت شبیه‌سازی‌شده (تستی) است.
        </p>
      </div>
    </div>
  );
}
