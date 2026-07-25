'use client';

import { useState, useMemo, useEffect } from 'react';
import { format as formatJalali, startOfDay, endOfDay, parse as parseJalali } from 'date-fns-jalali';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppData } from '@/lib/store';
import { invoicePaid } from '@/lib/membership';
import { cn } from '@/lib/utils';
import { toCSV, downloadCSV } from '@/lib/csv';

const fmt = (n: number) => `${(n || 0).toLocaleString('fa-IR')} تومان`;

export default function CashierPage() {
  const { orders, purchases, manualExpenses, membershipInvoices } = useAppData();
  const [isClient, setIsClient] = useState(false);
  const [dateIso, setDateIso] = useState(new Date().toISOString());

  useEffect(() => setIsClient(true), []);

  const day = useMemo(() => {
    const d = new Date(dateIso);
    return { start: startOfDay(d).getTime(), end: endOfDay(d).getTime() };
  }, [dateIso]);

  const inDay = (iso?: string) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= day.start && t <= day.end;
  };

  const buffetOrders = useMemo(() => orders.filter((o) => inDay(o.createdAt)), [orders, day]);
  const buffetSales = buffetOrders.reduce((s, o) => s + o.total, 0);
  const buffetCOGS = buffetOrders.reduce((s, o) => s + (o.totalCost || 0), 0);
  const buffetGross = buffetSales - buffetCOGS;

  // Gym: membership collections on this day (both one-shot and installments).
  const gymCollected = useMemo(() => {
    let total = 0;
    for (const inv of membershipInvoices) {
      if (!inv.isInstallment) {
        if (inv.status === 'paid' && inDay(inv.issueDate)) total += inv.total;
      } else {
        total += inv.installments.reduce((s, ins) => (ins.paid && ins.paidDate && inDay(ins.paidDate) ? s + ins.amount : s), 0);
      }
    }
    return total;
  }, [membershipInvoices, day]);

  const buffetExpenses = useMemo(() => manualExpenses.filter((e) => inDay(e.date) && (e.scope || 'shared') === 'buffet'), [manualExpenses, day]);
  const gymExpenses = useMemo(() => manualExpenses.filter((e) => inDay(e.date) && (e.scope || 'shared') === 'gym'), [manualExpenses, day]);
  const sharedExpenses = useMemo(() => manualExpenses.filter((e) => inDay(e.date) && (e.scope || 'shared') === 'shared'), [manualExpenses, day]);

  const buffetNet = buffetSales - buffetExpenses.reduce((s, e) => s + e.amount, 0);
  const gymNet = gymCollected - gymExpenses.reduce((s, e) => s + e.amount, 0);
  const grandCash = buffetNet + gymNet - sharedExpenses.reduce((s, e) => s + e.amount, 0);

  if (!isClient) {
    return (
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[]} activeBreadcrumb="صندوق‌داری" />
        <main className="flex-1 p-4 sm:px-6 sm:py-6">
          <PageHeader title="گزارش روزانه صندوق‌داری" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  const exportCsv = () => {
    const rows = [
      { section: 'بوفه - فروش', value: buffetSales },
      { section: 'بوفه - بهای تمام‌شده', value: buffetCOGS },
      { section: 'بوفه - سود ناخالص', value: buffetGross },
      { section: 'بوفه - هزینه‌ها', value: buffetExpenses.reduce((s, e) => s + e.amount, 0) },
      { section: 'بوفه - خالص', value: buffetNet },
      { section: 'باشگاه - وصولی شهریه', value: gymCollected },
      { section: 'باشگاه - هزینه‌ها', value: gymExpenses.reduce((s, e) => s + e.amount, 0) },
      { section: 'باشگاه - خالص', value: gymNet },
      { section: 'مشترک - هزینه‌ها', value: sharedExpenses.reduce((s, e) => s + e.amount, 0) },
      { section: 'جمع وجه نقد', value: grandCash },
    ];
    downloadCSV(
      `cashier-${formatJalali(new Date(dateIso), 'yyyy-MM-dd')}.csv`,
      toCSV(rows, [{ key: 'section', header: 'بخش' }, { key: 'value', header: 'مبلغ (تومان)' }])
    );
  };

  const ExpenseTable = ({ title, rows, color }: { title: string; rows: typeof manualExpenses; color: string }) => (
    <div>
      <p className={cn('text-sm font-medium mb-1', color)}>{title} ({rows.reduce((s, e) => s + e.amount, 0).toLocaleString('fa-IR')} تومان)</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">موردی ثبت نشده.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>توضیحات</TableHead>
              <TableHead className="text-left">مبلغ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.description}</TableCell>
                <TableCell className="text-left font-medium">{fmt(e.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="صندوق‌داری" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="گزارش روزانه صندوق‌داری">
          <Button variant="outline" onClick={exportCsv}>خروجی CSV</Button>
          <Button variant="outline" onClick={() => window.print()}>چاپ</Button>
        </PageHeader>

        <div className="grid gap-2 max-w-xs mb-4">
          <Label>تاریخ گزارش</Label>
          <Input
            value={formatJalali(new Date(dateIso), 'yyyy/MM/dd')}
            onChange={(e) => {
              try {
                const p = parseJalali(e.target.value, 'yyyy/MM/dd', new Date());
                if (!isNaN(p.getTime())) setDateIso(p.toISOString());
              } catch { /* ignore */ }
            }}
            dir="ltr"
          />
        </div>

        {/* Two separate books: بوفه و باشگاه never merged into one owner's account */}
        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <Card className="border-blue-500/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-600">دفتر بوفه</CardTitle>
              <CardDescription>درآمد و هزینه‌های واحد بوفه (مالک مجزا).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="فروش بوفه" value={fmt(buffetSales)} />
              <Row label="بهای تمام‌شده کالا" value={fmt(buffetCOGS)} />
              <Row label="سود ناخالص" value={fmt(buffetGross)} className="text-green-600" />
              <Row label="هزینه‌های بوفه" value={fmt(buffetExpenses.reduce((s, e) => s + e.amount, 0))} className="text-destructive" />
              <Row label="خالص بوفه" value={fmt(buffetNet)} className="font-bold" />
            </CardContent>
          </Card>

          <Card className="border-emerald-500/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-emerald-600">دفتر باشگاه</CardTitle>
              <CardDescription>وصولی شهریه و هزینه‌های واحد باشگاه (مالک مجزا).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="وصولی شهریه" value={fmt(gymCollected)} className="text-green-600" />
              <Row label="هزینه‌های باشگاه" value={fmt(gymExpenses.reduce((s, e) => s + e.amount, 0))} className="text-destructive" />
              <Row label="خالص باشگاه" value={fmt(gymNet)} className="font-bold" />
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4 border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-600">هزینه‌های مشترک</CardTitle>
            <CardDescription>هزینه‌هایی که بین دو واحد تقسیم نشده‌اند.</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseTable title="مشترک" rows={sharedExpenses} color="text-amber-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>جمع‌بندی صندوق</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="خالص بوفه" value={fmt(buffetNet)} />
            <Row label="خالص باشگاه" value={fmt(gymNet)} />
            <Row label="هزینه مشترک" value={fmt(sharedExpenses.reduce((s, e) => s + e.amount, 0))} className="text-destructive" />
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>وجه نقد قابل تسویه</span>
              <span className={cn(grandCash >= 0 ? 'text-green-600' : 'text-destructive')}>{fmt(grandCash)}</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', className)}>{value}</span>
    </div>
  );
}
