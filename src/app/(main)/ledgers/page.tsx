'use client';

import { Scale, Store, Dumbbell } from 'lucide-react';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppData } from '@/lib/store';
import { calculateLedgers, type Ledger } from '@/lib/metrics';
import { useActiveRole, viewableBooks, canViewBook, roleLabel } from '@/lib/rbac';

function LedgerCard({ ledger, icon: Icon, accent }: { ledger: Ledger; icon: React.ElementType; accent: string }) {
  return (
    <Card className={accent}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {ledger.label}
        </CardTitle>
        <CardDescription>{ledger.owner ? `صاحب: ${ledger.owner}` : 'دفتر مجزا'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">درآمد</p>
            <p className="font-bold text-green-600">{(ledger.revenue || 0).toLocaleString('fa-IR')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">هزینه</p>
            <p className="font-bold text-red-600">{(ledger.expenses || 0).toLocaleString('fa-IR')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">خالص</p>
            <p className={`font-bold ${(ledger.net || 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>{(ledger.net || 0).toLocaleString('fa-IR')}</p>
          </div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>شرح</TableHead><TableHead className="text-left">مبلغ</TableHead></TableRow></TableHeader>
          <TableBody>
            {ledger.lines.map((l, i) => (
              <TableRow key={i}>
                <TableCell>{l.label}</TableCell>
                <TableCell className={`text-left ${l.value < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {l.value.toLocaleString('fa-IR')} تومان
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function LedgersPage() {
  const appData = useAppData();
  const [role] = useActiveRole();
  const { buffet, gym } = calculateLedgers(appData, appData.account);
  const canBuffet = canViewBook(role, 'buffet');
  const canGym = canViewBook(role, 'gym');
  const restricted = !(canBuffet && canGym);

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="دفتر دوگانه" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="حسابداری دوگانه (بوفه و باشگاه)">
          <p className="text-sm text-muted-foreground">
            حساب بوفه و حساب باشگاه <strong>دو دفتر مجزا</strong> نمایش داده می‌شوند (پیش‌فرض تفکیک). نکته: اگر فضای بوفه به مستأجر اجاره داده شود، درآمد عملیاتی آن متعلق به مستأجر است و در تراز باشگاه لحاظ نمی‌شود.
          </p>
        </PageHeader>

        {restricted && (
          <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-800">
            نمایش محدود به نقش «{roleLabel(role)}»: شما فقط مجاز به مشاهدهٔ دفتر <strong>{canBuffet ? 'بوفه' : 'باشگاه'}</strong> هستید؛ دفتر دیگر برای شما نمایش داده نمی‌شود.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {canBuffet && <LedgerCard ledger={buffet} icon={Store} accent="border-blue-500/30" />}
          {canGym && <LedgerCard ledger={gym} icon={Dumbbell} accent="border-emerald-500/30" />}
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Scale className="h-4 w-4" />نکته مهم حسابداری</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <div>• درآمد بوفه (فروش محصولات/مواد) و هزینه‌های آن فقط در دفتر <Badge variant="secondary">بوفه</Badge> منعکس می‌شود.</div>
            <div>• درآمد باشگاه (شهریه، اجاره‌بهای فضاها، رزرو کلاس) و هزینه‌های آن (از جمله حقوق کارکنان) فقط در دفتر <Badge variant="outline">باشگاه</Badge> منعکس می‌شود.</div>
            <div>• هیچ جمعِ واحدی بین دو دفتر محاسبه نمی‌شود؛ هر صاحب گزارش خود را جدا می‌بیند.</div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
