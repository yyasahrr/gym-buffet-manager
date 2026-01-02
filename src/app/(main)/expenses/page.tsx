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
import { useToast } from '@/hooks/use-toast';
import { type Expense, type Purchase } from '@/lib/types';
import { expenses as initialExpenses, purchases as initialPurchases } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const MANUAL_EXPENSES_STORAGE_KEY = 'gym-canteen-expenses';
const PURCHASES_STORAGE_KEY = 'gym-canteen-purchases';

type CombinedExpense = {
    id: string;
    description: string;
    amount: number;
    date: string;
    type: 'manual' | 'purchase' | 'transport';
}

export default function ExpensesPage() {
  const [manualExpenses, setManualExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const { toast } = useToast();
  
  useEffect(() => {
    const storedManualExpenses = localStorage.getItem(MANUAL_EXPENSES_STORAGE_KEY);
    setManualExpenses(storedManualExpenses ? JSON.parse(storedManualExpenses) : initialExpenses);

    const storedPurchases = localStorage.getItem(PURCHASES_STORAGE_KEY);
    setPurchases(storedPurchases ? JSON.parse(storedPurchases) : initialPurchases);
  }, []);

  const combinedExpenses = useMemo(() => {
    const allExpenses: CombinedExpense[] = [];

    // Add manual expenses
    manualExpenses.forEach(exp => {
        allExpenses.push({ ...exp, type: 'manual' });
    });

    // Add automatic expenses from purchases
    purchases.forEach(pur => {
        const purchaseTotal = (pur.items || []).reduce((sum, item) => sum + (item.lineTotalCost || 0), 0);
        if (purchaseTotal > 0) {
            allExpenses.push({
                id: `pur-cost-${pur.id}`,
                description: `خرید اقلام فاکتور #${pur.id.substring(4)}`,
                amount: purchaseTotal,
                date: pur.date,
                type: 'purchase',
            });
        }
        if (pur.transportCost > 0) {
            allExpenses.push({
                id: `pur-transport-${pur.id}`,
                description: `هزینه حمل فاکتور #${pur.id.substring(4)}`,
                amount: pur.transportCost,
                date: pur.date,
                type: 'transport',
            });
        }
    });

    return allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [manualExpenses, purchases]);


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
    };

    const updatedExpenses = [...manualExpenses, expenseData];
    setManualExpenses(updatedExpenses);
    localStorage.setItem(MANUAL_EXPENSES_STORAGE_KEY, JSON.stringify(updatedExpenses));

    toast({
      title: 'موفقیت‌آمیز',
      description: `هزینه "${newExpense.description}" با موفقیت ثبت شد.`,
    });

    setIsDialogOpen(false);
    setNewExpense({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
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

      return combinedExpenses.filter(exp => isWithinInterval(new Date(exp.date), interval));
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
    
    return (
        <div className="grid gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                     <CardDescription>خلاصه خروج وجه نقد در این دوره</CardDescription>
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
                        <TableHead>مبلغ</TableHead>
                        <TableHead>تاریخ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenseList.length > 0 ? (
                        expenseList.map(exp => (
                            <TableRow key={exp.id}>
                            <TableCell>{exp.description}</TableCell>
                            <TableCell>{exp.amount.toLocaleString('fa-IR')} تومان</TableCell>
                            <TableCell>{formatJalali(new Date(exp.date), 'yyyy/MM/dd')}</TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
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
