'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import {
  add,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { format as formatJalali, parse } from 'date-fns-jalali';

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
import { type Expense } from '@/lib/types';
import { expenses as initialExpenses } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EXPENSES_STORAGE_KEY = 'gym-canteen-expenses';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString(),
  });
  const { toast } = useToast();

  useEffect(() => {
    const storedExpenses = localStorage.getItem(EXPENSES_STORAGE_KEY);
    setExpenses(storedExpenses ? JSON.parse(storedExpenses) : initialExpenses);
  }, []);

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
      date: newExpense.date,
    };

    const updatedExpenses = [...expenses, expenseData];
    setExpenses(updatedExpenses);
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(updatedExpenses));

    toast({
      title: 'موفقیت‌آمیز',
      description: `هزینه "${newExpense.description}" با موفقیت ثبت شد.`,
    });

    setIsDialogOpen(false);
    setNewExpense({ description: '', amount: '', date: new Date().toISOString() });
  };
  
  const groupedExpenses = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 6 }); // Saturday
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 6 });
    const startOfThisMonth = startOfMonth(today);
    const endOfThisMonth = endOfMonth(today);

    const daily = expenses.filter(exp => isSameDay(new Date(exp.date), today));
    const weekly = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= startOfThisWeek && expDate <= endOfThisWeek;
    });
    const monthly = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= startOfThisMonth && expDate <= endOfThisMonth;
    });

    return { daily, weekly, monthly };
  }, [expenses]);
  
  const renderExpenseTable = (expenseList: Expense[], title: string) => {
    const total = expenseList.reduce((sum, exp) => sum + exp.amount, 0);
    
    return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>مجموع: {total.toLocaleString('fa-IR')} تومان</CardDescription>
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
                      هزینه‌ای ثبت نشده است.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
                <PlusCircle className="ml-2 h-4 w-4" /> ثبت هزینه جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>ثبت هزینه جدید</DialogTitle>
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
                    value={format(new Date(newExpense.date), 'yyyy-MM-dd')}
                    onChange={(e) => setNewExpense({ ...newExpense, date: new Date(e.target.value).toISOString() })}
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
                {renderExpenseTable(groupedExpenses.daily, 'هزینه‌های امروز')}
            </TabsContent>
            <TabsContent value="weekly">
                {renderExpenseTable(groupedExpenses.weekly, 'هزینه‌های این هفته')}
            </TabsContent>
            <TabsContent value="monthly">
                {renderExpenseTable(groupedExpenses.monthly, 'هزینه‌های این ماه')}
            </TabsContent>
        </Tabs>
        
      </main>
    </div>
  );
}
