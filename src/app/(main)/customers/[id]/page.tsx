'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { format as formatJalali } from 'date-fns-jalali';
import { PlusCircle, MinusCircle, Pencil } from 'lucide-react';
import { useAppData, dataStore } from '@/lib/store';
import { Customer, CustomerTransaction } from '@/lib/types';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { computeInvoiceStatus, invoicePaid, invoiceRemaining, periodLabels, daysUntil } from '@/lib/membership';
import { Skeleton } from '@/components/ui/skeleton';

type DialogState = {
  isOpen: boolean;
  type: 'credit' | 'debit';
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { customers, customerTransactions, membershipPlans, memberships, membershipInvoices } = useAppData();
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false, type: 'credit' });
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const customer = useMemo(() => customers.find(c => c.id === id), [id, customers]);

  const transactions = useMemo(() => {
    return customerTransactions
      .filter(t => t.customerId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [id, customerTransactions]);

  const balance = useMemo(() => {
    return transactions.reduce((acc, t) => {
      return t.type === 'credit' ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  const planMap = useMemo(() => new Map((membershipPlans || []).map((p) => [p.id, p])), [membershipPlans]);
  const customerMemberships = useMemo(
    () => (memberships || []).filter((m) => m.customerId === id),
    [memberships, id]
  );
  const customerInvoices = useMemo(
    () => (membershipInvoices || []).filter((i) => i.customerId === id),
    [membershipInvoices, id]
  );

  if (!isClient) {
     return (
       <div className="flex flex-col h-full">
         <Header breadcrumbs={[{ href: '/customers', label: 'مشتریان' }]} activeBreadcrumb="بارگذاری..." />
         <main className="flex-1 p-4 sm:px-6 sm:py-6">
           <PageHeader title={<Skeleton className="h-9 w-48" />} />
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="md:col-span-1">
                    <CardHeader><CardTitle>اطلاعات مشتری</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-8 w-1/2" />
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>گردش حساب</CardTitle>
                        <CardDescription>لیست تمام تراکنش‌های مالی این مشتری.</CardDescription>
                    </CardHeader>
                    <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
            </div>
         </main>
       </div>
     );
  }

  if (!customer) {
    return (
        <div className="flex flex-col h-full">
            <Header breadcrumbs={[{href: '/customers', label: "مشتریان"}]} activeBreadcrumb="یافت نشد" />
            <main className="flex-1 p-4 sm:px-6 sm:py-6">
                <PageHeader title="مشتری یافت نشد" />
                <p>مشتری مورد نظر یافت نشد.</p>
            </main>
        </div>
    )
  }

  const openDialog = (type: 'credit' | 'debit') => {
    setTransactionAmount('');
    setTransactionDescription(type === 'credit' ? 'شارژ حساب' : 'برداشت از حساب');
    setDialogState({ isOpen: true, type });
  };

  const handleAddTransaction = () => {
    const amount = parseInt(transactionAmount, 10);
    if (!amount || amount <= 0) {
      toast({ variant: 'destructive', title: 'خطا', description: 'لطفاً مبلغ معتبری را وارد کنید.' });
      return;
    }
    if (!transactionDescription) {
        toast({ variant: 'destructive', title: 'خطا', description: 'لطفاً توضیحات تراکنش را وارد کنید.' });
        return;
    }

    const newTransaction: CustomerTransaction = {
      id: `trx-${Date.now()}`,
      customerId: customer.id,
      date: new Date().toISOString(),
      type: dialogState.type,
      amount,
      description: transactionDescription,
    };

    const updatedTransactions = [...customerTransactions, newTransaction];
    dataStore.saveData({ customerTransactions: updatedTransactions });

    toast({
      title: 'موفقیت‌آمیز',
      description: `تراکنش با موفقیت ثبت شد.`,
    });

    setDialogState({ isOpen: false, type: 'credit' });
  };

  const openEdit = () => {
    setEditName(customer.name);
    setEditLastName(customer.lastName || '');
    setEditNationalId(customer.nationalId || '');
    setEditEmail(customer.email || '');
    setEditPhone(customer.phone || '');
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editName) {
      toast({ variant: 'destructive', title: 'خطا', description: 'لطفاً نام مشتری را وارد کنید.' });
      return;
    }
    const updatedCustomers = customers.map((c) =>
      c.id === customer.id
        ? {
            ...c,
            name: editName,
            lastName: editLastName || undefined,
            nationalId: editNationalId || undefined,
            email: editEmail || undefined,
            phone: editPhone || undefined,
          }
        : c
    );
    dataStore.saveData({ customers: updatedCustomers });
    toast({ title: 'ذخیره شد', description: 'اطلاعات مشتری بروزرسانی شد.' });
    setEditOpen(false);
  };

  const newBalancePreview = (balance || 0) + (dialogState.type === 'credit' ? (parseInt(transactionAmount) || 0) : -(parseInt(transactionAmount) || 0));

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[{ href: '/customers', label: 'مشتریان' }]} activeBreadcrumb={customer.name} />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title={customer.name}>
          <div className="flex gap-2">
            <Button onClick={() => openDialog('credit')} variant="default">
              <PlusCircle className="ml-2 h-4 w-4" /> شارژ حساب
            </Button>
            <Button onClick={() => openDialog('debit')} variant="destructive">
              <MinusCircle className="ml-2 h-4 w-4" /> ثبت بدهی/برداشت
            </Button>
          </div>
        </PageHeader>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle>اطلاعات مشتری</CardTitle>
              <Button size="sm" variant="outline" onClick={openEdit}><Pencil className="ml-2 h-4 w-4" /> ویرایش</Button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">نام</span>
                <span>{customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">وضعیت</span>
                <span className={cn('font-semibold', customer.status === 'active' ? 'text-green-600' : 'text-gray-500')}>
                  {customer.status === 'active' ? 'فعال' : 'بایگانی شده'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ایمیل</span>
                <span dir="ltr" className="max-w-[60%] truncate text-left">{customer.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">موبایل</span>
                <span dir="ltr">{customer.phone || '—'}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-muted-foreground">موجودی فعلی</span>
                <span className={cn('text-2xl font-bold', balance < 0 ? 'text-destructive' : balance > 0 ? 'text-green-600' : 'text-foreground')}>
                  {balance.toLocaleString('fa-IR')}
                  <span className="text-sm font-normal"> تومان</span>
                </span>
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>گردش حساب</CardTitle>
              <CardDescription>لیست تمام تراکنش‌های مالی این مشتری.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>تاریخ</TableHead>
                    <TableHead>نوع</TableHead>
                    <TableHead>توضیحات</TableHead>
                    <TableHead className="text-left">مبلغ (تومان)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{formatJalali(new Date(t.date), 'yyyy/MM/dd')}</TableCell>
                      <TableCell>
                        <span className={cn(t.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                          {t.type === 'credit' ? 'واریز' : 'برداشت'}
                        </span>
                      </TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell className="text-left font-mono">
                        {t.type === 'credit' ? '+' : '-'}{t.amount.toLocaleString('fa-IR')}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">تراکنشی ثبت نشده است.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>عضویت‌های این مشتری</CardTitle>
              <CardDescription>پلن‌های عضویت (جدا از حساب بوفه).</CardDescription>
            </CardHeader>
            <CardContent>
              {customerMemberships.length === 0 ? (
                <p className="text-sm text-muted-foreground">عضویتی ثبت نشده است.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>پلن</TableHead>
                      <TableHead>شروع</TableHead>
                      <TableHead>پایان</TableHead>
                      <TableHead>وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerMemberships.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{planMap.get(m.planId)?.name || 'نامشخص'}</TableCell>
                        <TableCell>{formatJalali(new Date(m.startDate), 'yyyy/MM/dd')}</TableCell>
                        <TableCell>{formatJalali(new Date(m.endDate), 'yyyy/MM/dd')}</TableCell>
                        <TableCell>
                          <span className={cn(m.status === 'active' ? 'text-green-600' : m.status === 'paused' ? 'text-amber-600' : 'text-destructive')}>
                            {m.status === 'active' ? 'فعال' : m.status === 'paused' ? 'تعلیق' : 'لغو'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>فاکتورهای شهریه</CardTitle>
              <CardDescription>صورت‌حساب‌های شهریه (جدا از حساب بوفه).</CardDescription>
            </CardHeader>
            <CardContent>
              {customerInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">فاکتوری صادر نشده است.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>عنوان</TableHead>
                      <TableHead>مبلغ کل</TableHead>
                      <TableHead>باقی‌مانده</TableHead>
                      <TableHead>وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerInvoices.map((inv) => {
                      const st = computeInvoiceStatus(inv);
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.title}</TableCell>
                          <TableCell>{(inv.total || 0).toLocaleString('fa-IR')} تومان</TableCell>
                          <TableCell className={cn(invoiceRemaining(inv) > 0 ? 'text-destructive' : '')}>{(invoiceRemaining(inv) || 0).toLocaleString('fa-IR')} تومان</TableCell>
                          <TableCell>
                            <span className={cn(st === 'paid' ? 'text-green-600' : st === 'overdue' ? 'text-destructive' : st === 'partial' ? 'text-amber-600' : 'text-muted-foreground')}>
                              {st === 'paid' ? 'پرداخت‌شده' : st === 'overdue' ? 'سررسید گذشته' : st === 'partial' ? 'پرداخت جزئی' : 'پرداخت نشده'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction Dialog */}
        <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => !isOpen && setDialogState({ isOpen: false, type: 'credit' })}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{dialogState.type === 'credit' ? 'شارژ حساب مشتری' : 'ثبت بدهی/برداشت از حساب'}</DialogTitle>
              <DialogDescription>
                مبلغ و توضیحات تراکنش برای {customer.name} را وارد کنید.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">مبلغ (تومان)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  className="col-span-3"
                  placeholder="مثال: 500000"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">توضیحات</Label>
                <Input
                  id="description"
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">موجودی جدید</Label>
                <div className={cn("col-span-3 font-bold text-lg", newBalancePreview < 0 ? 'text-destructive' : 'text-primary')}>
                  {newBalancePreview.toLocaleString('fa-IR')} تومان
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogState({ isOpen: false, type: 'credit' })}>لغو</Button>
              <Button type="submit" onClick={handleAddTransaction}>ثبت تراکنش</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit contact info dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>ویرایش اطلاعات تماس مشتری</DialogTitle>
              <DialogDescription>ایمیل و شماره موبایل برای ارسال لینک پرداخت پورتال استفاده می‌شوند.</DialogDescription>
            </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cname" className="text-right">نام</Label>
                  <Input id="cname" value={editName} onChange={(e) => setEditName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="clast" className="text-right">نام خانوادگی</Label>
                  <Input id="clast" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cnat" className="text-right">کد ملی</Label>
                  <Input id="cnat" dir="ltr" value={editNationalId} onChange={(e) => setEditNationalId(e.target.value.replace(/\D/g, '').slice(0, 10))} className="col-span-3" placeholder="۱۰ رقم" inputMode="numeric" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cemail" className="text-right">ایمیل</Label>
                  <Input id="cemail" dir="ltr" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="col-span-3" placeholder="example@domain.com" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cphone" className="text-right">موبایل</Label>
                  <Input id="cphone" dir="ltr" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="col-span-3" placeholder="09..." />
                </div>
              </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>لغو</Button>
              <Button type="submit" onClick={saveEdit}>ذخیره</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
