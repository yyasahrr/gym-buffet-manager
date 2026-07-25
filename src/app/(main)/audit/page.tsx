'use client';

import { useState, useMemo, useEffect } from 'react';
import { format as formatJalali } from 'date-fns-jalali';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppData } from '@/lib/store';
import { auditActionLabel } from '@/lib/audit';
import { toCSV, downloadCSV } from '@/lib/csv';
import { cn } from '@/lib/utils';

const scopeLabel: Record<string, string> = {
  buffet: 'بوفه',
  gym: 'باشگاه',
  system: 'سیستم',
};

export default function AuditPage() {
  const { auditLog } = useAppData();
  const [isClient, setIsClient] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  useEffect(() => setIsClient(true), []);

  const rows = useMemo(() => {
    const list = (auditLog || []).slice();
    if (scopeFilter !== 'all') return list.filter((a) => (a.scope || 'system') === scopeFilter);
    return list;
  }, [auditLog, scopeFilter]);

  if (!isClient) {
    return (
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[]} activeBreadcrumb="لاگ فعالیت" />
        <main className="flex-1 p-4 sm:px-6 sm:py-6">
          <PageHeader title="لاگ فعالیت" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  const exportCsv = () => {
    const csv = toCSV(
      rows.map((a) => ({
        at: formatJalali(new Date(a.at), 'yyyy/MM/dd HH:mm'),
        action: auditActionLabel(a.action),
        actor: a.actor || '',
        scope: scopeLabel[a.scope || 'system'] || a.scope || '',
        detail: a.detail || '',
      })),
      [
        { key: 'at', header: 'زمان' },
        { key: 'action', header: 'عملیات' },
        { key: 'actor', header: 'عامل' },
        { key: 'scope', header: 'حوزه' },
        { key: 'detail', header: 'توضیحات' },
      ]
    );
    downloadCSV(`audit-${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="لاگ فعالیت" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="لاگ فعالیت (Audit Log)">
          <Button variant="outline" onClick={exportCsv}>خروجی CSV</Button>
        </PageHeader>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>تاریخچه تغییرات</CardTitle>
                <CardDescription>ثبت تمام عملیات مهم در سیستم (فروش، پرداخت، تغییر عضویت و ...).</CardDescription>
              </div>
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="حوزه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه حوزه‌ها</SelectItem>
                  <SelectItem value="buffet">بوفه</SelectItem>
                  <SelectItem value="gym">باشگاه</SelectItem>
                  <SelectItem value="system">سیستم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">موردی ثبت نشده است.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>زمان</TableHead>
                    <TableHead>عملیات</TableHead>
                    <TableHead>عامل</TableHead>
                    <TableHead>حوزه</TableHead>
                    <TableHead>توضیحات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap">{formatJalali(new Date(a.at), 'yyyy/MM/dd HH:mm')}</TableCell>
                      <TableCell className="font-medium">{auditActionLabel(a.action)}</TableCell>
                      <TableCell>{a.actor || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={a.scope === 'gym' ? 'default' : a.scope === 'buffet' ? 'secondary' : 'outline'}>
                          {scopeLabel[a.scope || 'system'] || a.scope}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn('max-w-[280px] truncate')} title={a.detail}>{a.detail || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
