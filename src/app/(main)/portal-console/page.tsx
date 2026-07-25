'use client';

import { useState, useEffect, useRef } from 'react';
import { format as formatJalali } from 'date-fns-jalali';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Users, CreditCard, Receipt, CalendarCheck, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusResp = {
  ok: boolean;
  at: string;
  counts: {
    members: number;
    activeMembers: number;
    memberships: number;
    invoices: number;
    unpaidInvoices: number;
    payments: number;
    pendingPayments: number;
    successfulPayments: number;
    plans: number;
  };
  lastModified: number;
  recent: { id: string; amount: number; status: string; authority: string; createdAt: string }[];
};

export default function PortalConsolePage() {
  const [data, setData] = useState<StatusResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/portal/status', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'خطا');
      setData(json);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'ارتباط با سرور پورتال برقرار نشد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    timer.current = setInterval(() => {
      if (live) fetchStatus();
    }, 8000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [live]);

  const stat = (label: string, value: number | string, icon: React.ReactNode, color = '') => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-bold', color)}>{value.toLocaleString('fa-IR')}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="نمایشگر پورتال" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="نمایشگر وضعیت پورتال مشتری">
          <Button variant={live ? 'default' : 'outline'} size="sm" onClick={() => setLive((v) => !v)}>
            <RefreshCw className={cn('ml-2 h-4 w-4', live && 'animate-spin')} />
            {live ? 'بروزرسانی زنده' : 'متوقف'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchStatus}>بروزرسانی دستی</Button>
        </PageHeader>

        {error && (
          <Card className="border-destructive mb-4">
            <CardContent className="text-destructive py-3">{error}</CardContent>
          </Card>
        )}

        {loading && !data ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : data ? (
          <>
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              {stat('اعضای پورتال', data.counts.members, <Users className="h-4 w-4 text-muted-foreground" />)}
              {stat('عضویت‌های فعال', data.counts.memberships, <CalendarCheck className="h-4 w-4 text-muted-foreground" />)}
              {stat('فاکتورها (پرداخت‌نشده)', data.counts.unpaidInvoices, <Receipt className="h-4 w-4 text-amber-500" />, 'text-amber-600')}
              {stat('پرداخت‌های موفق', data.counts.successfulPayments, <CreditCard className="h-4 w-4 text-green-500" />, 'text-green-600')}
              {stat('پرداخت‌های در انتظار', data.counts.pendingPayments, <CreditCard className="h-4 w-4 text-muted-foreground" />)}
              {stat('پلن‌های منتشرشده', data.counts.plans, <Receipt className="h-4 w-4 text-muted-foreground" />)}
              {stat('چک‌این امروز', data.counts.checkinsToday, <ScanLine className="h-4 w-4 text-primary" />, 'text-primary')}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>آخرین تراکنش‌های درگاه</CardTitle>
                <CardDescription>جدیدترین پرداخت‌های ثبت‌شده در سرور پورتال مشتری.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recent.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">تراکنشی ثبت نشده است.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>زمان</TableHead>
                        <TableHead>مبلغ</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>شناسه</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recent.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="whitespace-nowrap">{formatJalali(new Date(p.createdAt), 'yyyy/MM/dd HH:mm')}</TableCell>
                          <TableCell className="font-medium">{p.amount.toLocaleString('fa-IR')} تومان</TableCell>
                          <TableCell>
                            <Badge variant={p.status === 'success' ? 'default' : p.status === 'failed' ? 'destructive' : 'secondary'}>
                              {p.status === 'success' ? 'موفق' : p.status === 'failed' ? 'ناموفق' : 'در انتظار'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{p.authority}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-3">
              آخرین تغییر سرور: {formatJalali(new Date(data.lastModified), 'yyyy/MM/dd HH:mm:ss')}
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}
