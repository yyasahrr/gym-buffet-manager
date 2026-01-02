'use client';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Order, Purchase, CustomerTransaction, Customer } from '@/lib/types';
import { format as formatJalali, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns-jalali';
import { useState, useMemo, useEffect } from 'react';
import { useAppData } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

type DateRangeOption = 'today' | 'this_week' | 'this_month' | 'all';

const COLORS_GREEN = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];
const COLORS_RED = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];


export default function ReportsPage() {
  const { orders, purchases, customerTransactions, customers } = useAppData();
  const [isClient, setIsClient] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeOption>('today');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c])), [customers]);

  const dateInterval = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'this_week':
        return { start: startOfWeek(now, { weekStartsOn: 6 }), end: endOfWeek(now, { weekStartsOn: 6 }) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'all':
      default:
        return null;
    }
  }, [dateRange]);

  const filterByDate = <T extends { createdAt?: string; date?: string }>(items: T[]): T[] => {
    if (!dateInterval) return items;
    return items.filter(item => {
      const itemDateStr = item.createdAt || item.date;
      if (!itemDateStr) return false;
      const itemDate = new Date(itemDateStr);
      return isWithinInterval(itemDate, dateInterval);
    });
  };
  
  const customerBalances = useMemo(() => {
    const balances = new Map<string, number>();
    customers.forEach(c => balances.set(c.id, 0));
    customerTransactions.forEach(t => {
      const currentBalance = balances.get(t.customerId) || 0;
      const newBalance = t.type === 'credit' ? currentBalance + t.amount : currentBalance - t.amount;
      balances.set(t.customerId, newBalance);
    });
    return balances;
  }, [customers, customerTransactions]);

  const filteredOrders = useMemo(() => filterByDate(orders), [orders, dateInterval]);
  const filteredPurchases = useMemo(() => filterByDate(purchases), [purchases, dateInterval]);
  const filteredCustomerTransactions = useMemo(() => filterByDate(customerTransactions), [customerTransactions, dateInterval]);

  const salesTotal = useMemo(() => filteredOrders.reduce((sum, order) => sum + order.total, 0), [filteredOrders]);
  const purchaseTotal = useMemo(() => filteredPurchases.reduce((sum, pur) => sum + pur.items.reduce((itemSum, i) => itemSum + (i.lineTotalCost || 0), 0) + pur.transportCost, 0), [filteredPurchases]);
  const totalCredit = useMemo(() => filteredCustomerTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0), [filteredCustomerTransactions]);
  const totalDebit = useMemo(() => filteredCustomerTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0), [filteredCustomerTransactions]);

  const renderSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-6 w-full" /></TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderSalesTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>خلاصه فروش</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">درآمد کل</p>
                <p className="text-2xl font-bold">{salesTotal.toLocaleString('fa-IR')} تومان</p>
            </div>
             <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">تعداد سفارشات</p>
                <p className="text-2xl font-bold">{filteredOrders.length.toLocaleString('fa-IR')}</p>
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>تاریخچه سفارشات</CardTitle>
          <CardDescription>لیست تمام سفارشات ثبت شده در دوره زمانی انتخاب شده.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>مشتری</TableHead>
                <TableHead>خلاصه سفارش</TableHead>
                <TableHead>مبلغ کل</TableHead>
                <TableHead>وضعیت پرداخت</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead><span className="sr-only">جزئیات</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? filteredOrders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.customerName}</TableCell>
                  <TableCell>{order.items.map(i => `${i.item.name} (x${i.quantity})`).join('، ')}</TableCell>
                  <TableCell>{order.total.toLocaleString('fa-IR')} تومان</TableCell>
                  <TableCell><Badge variant={order.status === 'پرداخت شده' ? 'default' : 'secondary'}>{order.status}</Badge></TableCell>
                  <TableCell>{formatJalali(new Date(order.createdAt), 'yyyy/MM/dd HH:mm')}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                        <Info className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">سفارشی یافت نشد.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderPurchasesTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>خلاصه خرید</CardTitle></CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">مبلغ کل خرید</p>
            <p className="text-2xl font-bold">{purchaseTotal.toLocaleString('fa-IR')} تومان</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>تاریخچه خرید</CardTitle>
          <CardDescription>لیست تمام فاکتورهای خرید ثبت شده در دوره زمانی انتخاب شده.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>اقلام</TableHead>
                <TableHead>هزینه حمل</TableHead>
                <TableHead>مبلغ نهایی</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length > 0 ? filteredPurchases.map(pur => {
                 const totalValue = (pur.items || []).reduce((sum, item) => sum + (item.lineTotalCost || 0), 0) + (pur.transportCost || 0);
                 return (
                    <TableRow key={pur.id}>
                        <TableCell>{formatJalali(new Date(pur.date), 'yyyy/MM/dd')}</TableCell>
                        <TableCell>{(pur.items || []).map(i => i.itemName).join('، ')}</TableCell>
                        <TableCell>{(pur.transportCost || 0).toLocaleString('fa-IR')} تومان</TableCell>
                        <TableCell className="font-semibold">{Math.round(totalValue).toLocaleString('fa-IR')} تومان</TableCell>
                    </TableRow>
                 )
              }) : (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">خریدی یافت نشد.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderCustomerLedgerTab = () => (
    <div className="space-y-4">
        <Card>
            <CardHeader><CardTitle>خلاصه گردش حساب مشتریان</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">جمع واریزها (شارژ)</p>
                    <p className="text-2xl font-bold text-green-600">+{totalCredit.toLocaleString('fa-IR')} تومان</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">جمع برداشت‌ها (بدهی)</p>
                    <p className="text-2xl font-bold text-red-600">-{totalDebit.toLocaleString('fa-IR')} تومان</p>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>تاریخچه تراکنش‌ها</CardTitle>
                <CardDescription>لیست تمام تراکنش‌های مالی مشتریان در دوره زمانی انتخاب شده.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>تاریخ</TableHead>
                            <TableHead>مشتری</TableHead>
                            <TableHead>نوع</TableHead>
                            <TableHead>توضیحات</TableHead>
                            <TableHead className="text-right">مبلغ (تومان)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredCustomerTransactions.length > 0 ? filteredCustomerTransactions.map(t => (
                        <TableRow key={t.id}>
                        <TableCell>{formatJalali(new Date(t.date), 'yyyy/MM/dd HH:mm')}</TableCell>
                        <TableCell>{customerMap.get(t.customerId)?.name || 'نامشخص'}</TableCell>
                        <TableCell>
                            <span className={cn(t.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                            {t.type === 'credit' ? 'واریز' : 'برداشت'}
                            </span>
                        </TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell className="text-right font-mono">
                            {t.type === 'credit' ? '+' : '-'}{t.amount.toLocaleString('fa-IR')}
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">تراکنشی یافت نشد.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );

  const renderCustomerBalanceTab = () => {
    const creditData = Array.from(customerBalances.entries())
      .map(([id, balance]) => ({ id, balance, name: customerMap.get(id)?.name || 'نامشخص' }))
      .filter(c => c.balance > 0)
      .sort((a,b) => b.balance - a.balance);

    const debitData = Array.from(customerBalances.entries())
      .map(([id, balance]) => ({ id, balance: Math.abs(balance), name: customerMap.get(id)?.name || 'نامشخص' }))
      .filter(c => c.balance > 0 && customerBalances.get(c.id)! < 0)
      .sort((a,b) => b.balance - a.balance);
    
    const totalPositiveBalance = creditData.reduce((sum, c) => sum + c.balance, 0);
    const totalNegativeBalance = debitData.reduce((sum, c) => sum + c.balance, 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-2 text-sm bg-background border rounded-lg shadow-sm">
                    <p className="font-bold">{payload[0].name}</p>
                    <p>{`${payload[0].value.toLocaleString('fa-IR')} تومان`}</p>
                </div>
            );
        }
        return null;
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>اعتبار مشتریان</CardTitle>
                    <CardDescription>نمودار مشتریانی که حساب مثبت دارند.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="p-4 bg-muted/50 rounded-lg mb-4">
                        <p className="text-sm text-muted-foreground">مجموع کل اعتبارها</p>
                        <p className="text-2xl font-bold text-green-600">{totalPositiveBalance.toLocaleString('fa-IR')} تومان</p>
                    </div>
                   {creditData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={creditData} dataKey="balance" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                    {creditData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_GREEN[index % COLORS_GREEN.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                   ) : (
                        <p className="text-center text-muted-foreground py-8">هیچ مشتری با اعتبار مثبت وجود ندارد.</p>
                   )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>بدهی مشتریان</CardTitle>
                    <CardDescription>نمودار مشتریانی که حساب منفی (بدهی) دارند.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-muted/50 rounded-lg mb-4">
                        <p className="text-sm text-muted-foreground">مجموع کل بدهی‌ها</p>
                        <p className="text-2xl font-bold text-red-600">{totalNegativeBalance.toLocaleString('fa-IR')} تومان</p>
                    </div>
                    {debitData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={debitData} dataKey="balance" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                    {debitData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_RED[index % COLORS_RED.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                         <p className="text-center text-muted-foreground py-8">هیچ مشتری بدهکاری وجود ندارد.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="گزارشات" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="گزارشات">
          <Select value={dateRange} onValueChange={(val) => setDateRange(val as DateRangeOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="انتخاب دوره زمانی" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">امروز</SelectItem>
              <SelectItem value="this_week">این هفته</SelectItem>
              <SelectItem value="this_month">این ماه</SelectItem>
              <SelectItem value="all">همه</SelectItem>
            </SelectContent>
          </Select>
        </PageHeader>
        
        <Tabs defaultValue="sales">
            <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="sales">فروش</TabsTrigger>
                <TabsTrigger value="purchases">خرید</TabsTrigger>
                <TabsTrigger value="customer_ledger">حساب مشتریان</TabsTrigger>
                <TabsTrigger value="customer_balance">بالانس مشتریان</TabsTrigger>
            </TabsList>
            <TabsContent value="sales">{isClient ? renderSalesTab() : renderSkeleton()}</TabsContent>
            <TabsContent value="purchases">{isClient ? renderPurchasesTab() : renderSkeleton()}</TabsContent>
            <TabsContent value="customer_ledger">{isClient ? renderCustomerLedgerTab() : renderSkeleton()}</TabsContent>
            <TabsContent value="customer_balance">{isClient ? renderCustomerBalanceTab() : renderSkeleton()}</TabsContent>
        </Tabs>

        <Dialog open={!!selectedOrder} onOpenChange={(isOpen) => !isOpen && setSelectedOrder(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>جزئیات سفارش #{selectedOrder?.id.substring(4)}</DialogTitle>
                    <DialogDescription>
                        برای {selectedOrder?.customerName} در تاریخ {selectedOrder && formatJalali(new Date(selectedOrder.createdAt), 'yyyy/MM/dd HH:mm')}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {selectedOrder?.items.map((item, index) => (
                        <div key={`${item.item.id}-${index}`} className="flex justify-between items-center">
                            <div>
                                <p className="font-medium">{item.item.name}</p>
                                <p className="text-sm text-muted-foreground">{item.quantity} x {item.item.sellPrice.toLocaleString('fa-IR')} تومان</p>
                            </div>
                            <p className="font-semibold">{(item.quantity * item.item.sellPrice).toLocaleString('fa-IR')} تومان</p>
                        </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                        <p>جمع کل</p>
                        <p>{selectedOrder?.total.toLocaleString('fa-IR')} تومان</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
