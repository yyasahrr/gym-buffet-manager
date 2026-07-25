'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import {
  isWithinInterval,
  endOfDay,
  startOfDay,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  type Interval,
} from 'date-fns';
import { format as formatJalali } from 'date-fns-jalali';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { type Expense, type Purchase, type ExpenseScope } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAppData, dataStore } from '@/lib/store';
import { useActiveRole, viewableBooks } from '@/lib/rbac';

type CombinedExpense = {
    id: string;
    description: string;
    amount: number;
    date: string;
    type: 'manual' | 'purchase' | 'transport';
    scope?: ExpenseScope;
}

const scopeLabel: Record<string, string> = { buffet: 'بوفه', gym: 'باشگاه', shared: 'مشترک' };

export default function ExpensesPage() {
  const { manualExpenses, purchases } = useAppData();
  const [role] = useActiveRole();
  // محدودهٔ دفترهای مجاز بر اساس نقش (دو دفتر هرگز ترکیب نمی‌شوند)
  const books = viewableBooks(role);
  const defaultScope = books.includes('buffet') ? 'buffet' : 'gym';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    scope: defaultScope as 'buffet' | 'gym' | 'shared',
  });
  const { toast } = useToast();

  const combinedExpenses = useMemo(() => {
    const allExpenses: CombinedExpense[] = [];

    // Add manual expenses
    manualExpenses.forEach(exp => {
        allExpenses.push({ ...exp, type: 'manual', scope: exp.scope || 'shared' });
    });

    // Add automatic expenses from purchases (these belong to the buffet unit)
    purchases.forEach(pur => {
        const purchaseTotal = (pur.items || []).reduce((sum, item) => sum + (item.lineTotalCost || 0), 0);
        if (purchaseTotal > 0) {
            allExpenses.push({
                id: `pur-cost-${pur.id}`,
                description: `خرید اقلام فاکتور #${pur.id.substring(4)}`,
                amount: purchaseTotal,
                date: pur.date,
                type: 'purchase',
                scope: 'buffet',
            });
        }
        if (pur.transportCost > 0) {
            allExpenses.push({
                id: `pur-transport-${pur.id}`,
                description: `هزینه حمل فاکتور #${pur.id.substring(4)}`,
                amount: pur.transportCost,
                date: pur.date,
                type: 'transport',
                scope: 'buffet',
            });
        }
    });

    return allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [manualExpenses, purchases]);

  // فقط هزینه‌های متعلق به دفتر(های) مجازِ نقش (به‌علاوهٔ مشترک) نمایش داده شوند
  const scopedExpenses = useMemo(
    () => combinedExpenses.filter((e) => books.includes(e.scope as 'buffet' | 'gym') || (e.scope || 'shared') === 'shared'),
    [combinedExpenses, books]
  );

  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const filteredCombined = useMemo(
    () => (scopeFilter === 'all' ? scopedExpenses : scopedExpenses.filter((e) => (e.scope || 'shared') === scopeFilter)),
    [scopedExpenses, scopeFilter]
  );


  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'لطفاً تمام فیلدها را پر کنید.',
      });
      return;
    }

    const expenseData: Expense = {
      id: `exp-${Date.now()}`,
      description: newExpense.description,
      amount: parseInt(newExpense.amount, 10),
      date: new Date(newExpense.date).toISOString(),
      scope: newExpense.scope,
    };

    const updatedExpenses = [...manualExpenses, expenseData];
    dataStore.saveData({ manualExpenses: updatedExpenses });

    toast({
      title: 'موفقیت‌آمیز',
      description: `هزینه "${newExpense.description}" با موفقیت ثبت شد.`,
    });

    setIsDialogOpen(false);
    setNewExpense({ description: '', amount: '', date: new Date().toISOString().split('T')[0], scope: defaultScope });
  };
  
  const getExpensesForPeriod = (period: 'daily' | 'weekly' | 'monthly') => {
      const today = new Date();
      let interval: Interval;

      switch(period) {
          case 'daily':
              interval = { start: startOfDay(today), end: endOfDay(today) };
              break;
          case 'weekly':
              interval = { start: startOfWeek(today, { weekStartsOn: 6 }), end: endOfWeek(today, { weekStartsOn: 6 }) };
              break;
          case 'monthly':
              interval = { start: startOfMonth(today), end: endOfMonth(today) };
              break;
      }

      return filteredCombined.filter(exp => isWithinInterval(new Date(exp.date), interval));
  }
  
  const renderExpenseTabContent = (period: 'daily' | 'weekly' | 'monthly', title: string) => {
    const expenseList = getExpensesForPeriod(period);

    const totals = expenseList.reduce((acc, exp) => {
        if (exp.type === 'purchase') acc.purchase += exp.amount;
        else if (exp.type === 'transport') acc.transport += exp.amount;
        else if (exp.type === 'manual') acc.manual += exp.amount;
        acc.total += exp.amount;
        return acc;
    }, { purchase: 0, transport: 0, manual: 0, total: 0 });

    // Separate totals by business unit so the two owners' books never mix.
    const byScope = expenseList.reduce((acc, exp) => {
        const s = exp.scope || 'shared';
        acc[s] = (acc[s] || 0) + exp.amount;
        return acc;
    }, {} as Record<string, number>);
    
    return (
        <div className="grid gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                     <CardDescription>خلاصه خروج وجه نقد در این دوره (تفکیک‌شده بر اساس واحد)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">جمع خریدها</span>
                        <span className="font-semibold">{totals.purchase.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">هزینه حمل</span>
                        <span className="font-semibold">{totals.transport.toLocaleString('fa-IR')} تومان</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">هزینه‌های دستی</span>
                        <span className="font-semibold">{totals.manual.toLocaleString('fa-IR')} تومان</span>
                    </div>
                    <Separator />
                    <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">بوفه: {(byScope.buffet || 0).toLocaleString('fa-IR')}</Badge>
                        <Badge variant="outline">باشگاه: {(byScope.gym || 0).toLocaleString('fa-IR')}</Badge>
                        <Badge variant="destructive">مشترک: {(byScope.shared || 0).toLocaleString('fa-IR')}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>جمع کل هزینه‌ها</span>
                        <span className="text-primary">{totals.total.toLocaleString('fa-IR')} تومان</span>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>لیست تراکنش‌ها</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>توضیحات</TableHead>
                        <TableHead>واحد</TableHead>
                        <TableHead>مبلغ</TableHead>
                        <TableHead>تاریخ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenseList.length > 0 ? (
                        expenseList.map(exp => (
                            <TableRow key={exp.id}>
                            <TableCell>{exp.description}</TableCell>
                            <TableCell><Badge variant={exp.scope === 'gym' ? 'default' : exp.scope === 'buffet' ? 'secondary' : 'outline'}>{scopeLabel[exp.scope || 'shared']}</Badge></TableCell>
                            <TableCell>{exp.amount.toLocaleString('fa-IR')} تومان</TableCell>
                            <TableCell>{formatJalali(new Date(exp.date), 'yyyy/MM/dd')}</TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                            هزینه‌ای در این دوره ثبت نشده است.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="هزینه‌ها" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="مدیریت هزینه‌ها">
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="واحد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه واحدهای مجاز</SelectItem>
              {books.includes('buffet') && <SelectItem value="buffet">بوفه</SelectItem>}
              {books.includes('gym') && <SelectItem value="gym">باشگاه</SelectItem>}
              <SelectItem value="shared">مشترک</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="ml-2 h-4 w-4" /> ثبت هزینه دستی
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>ثبت هزینه دستی جدید</DialogTitle>
                <DialogDescription>هزینه‌های متفرقه مانند اجاره، حقوق و ... را وارد کنید.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    توضیحات
                  </Label>
                  <Input
                    id="description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="col-span-3"
                    placeholder="مثال: اجاره مغازه"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="scope" className="text-right">
                    واحد مالی
                  </Label>
                  <Select value={newExpense.scope} onValueChange={(v) => setNewExpense({ ...newExpense, scope: v as 'buffet' | 'gym' | 'shared' })}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {books.includes('buffet') && <SelectItem value="buffet">بوفه (صاحب بوفه)</SelectItem>}
                      {books.includes('gym') && <SelectItem value="gym">باشگاه (صاحب باشگاه)</SelectItem>}
                      <SelectItem value="shared">مشترک</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    مبلغ (تومان)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    تاریخ
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
                  لغو
                </Button>
                <Button type="submit" onClick={handleAddExpense}>
                  ثبت
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        
        <Tabs defaultValue="daily">
            <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="daily">روزانه</TabsTrigger>
                <TabsTrigger value="weekly">هفتگی</TabsTrigger>
                <TabsTrigger value="monthly">ماهانه</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
                {renderExpenseTabContent('daily', 'هزینه‌های امروز')}
            </TabsContent>
            <TabsContent value="weekly">
                {renderExpenseTabContent('weekly', 'هزینه‌های این هفته')}
            </TabsContent>
            <TabsContent value="monthly">
                {renderExpenseTabContent('monthly', 'هزینه‌های این ماه')}
            </TabsContent>
        </Tabs>
        
      </main>
    </div>
  );
}
