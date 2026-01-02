'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Archive, ArchiveRestore, Info } from 'lucide-react';
import { Customer, Order, CustomerTransaction } from '@/lib/types';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAppData, dataStore } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';


type DialogState = {
  isOpen: boolean;
  mode: 'add' | 'edit';
  customer: Customer | null;
};

export default function CustomersPage() {
  const { customers, orders, customerTransactions } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false, mode: 'add', customer: null });
  const [formData, setFormData] = useState({ name: '' });
  const { toast } = useToast();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer =>
      customer.status === activeTab &&
      customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery, activeTab]);

  const openDialog = (mode: 'add' | 'edit', customer: Customer | null = null) => {
    setDialogState({ isOpen: true, mode, customer });
    if (mode === 'edit' && customer) {
      setFormData({ name: customer.name });
    } else {
      setFormData({ name: '' });
    }
  };

  const closeDialog = () => {
    setDialogState({ isOpen: false, mode: 'add', customer: null });
  };

  const handleSaveCustomer = () => {
    const { name } = formData;
    if (!name) {
      toast({ variant: 'destructive', title: 'خطا', description: 'لطفاً نام مشتری را پر کنید.' });
      return;
    }

    if (dialogState.mode === 'add') {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name,
        status: 'active',
      };
      const updatedCustomers = [...customers, newCustomer];
      dataStore.saveData({ customers: updatedCustomers });
      toast({ title: 'موفقیت‌آمیز', description: `مشتری "${name}" با موفقیت اضافه شد.` });
    } else if (dialogState.mode === 'edit' && dialogState.customer) {
      const updatedCustomers = customers.map(c =>
        c.id === dialogState.customer!.id ? { ...c, name } : c
      );
      dataStore.saveData({ customers: updatedCustomers });
      toast({ title: 'موفقیت‌آمیز', description: `مشتری "${name}" با موفقیت ویرایش شد.` });
    }

    closeDialog();
  };

  const handleArchive = (customerId: string) => {
    const updatedCustomers = customers.map(c => c.id === customerId ? { ...c, status: 'archived' } : c);
    dataStore.saveData({ customers: updatedCustomers });
    toast({ title: 'مشتری بایگانی شد' });
    setOpenMenuId(null);
  };

  const handleRestore = (customerId: string) => {
    const updatedCustomers = customers.map(c => c.id === customerId ? { ...c, status: 'active' } : c);
    dataStore.saveData({ customers: updatedCustomers });
    toast({ title: 'مشتری بازیابی شد' });
    setOpenMenuId(null);
  };

  const handleDelete = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const hasOrderHistory = orders.some(order => order.customerId === customerId);
    const hasTransactionHistory = customerTransactions.some(t => t.customerId === customerId);

    if (hasOrderHistory || hasTransactionHistory) {
      toast({
        variant: 'destructive',
        title: 'حذف امکان‌پذیر نیست',
        description: 'این مشتری دارای سابقه سفارش یا تراکنش است. لطفاً ابتدا آن را بایگانی کنید.',
      });
    } else {
      const updatedCustomers = customers.filter(c => c.id !== customerId);
      dataStore.saveData({ customers: updatedCustomers });
      toast({ title: 'مشتری برای همیشه حذف شد' });
    }
    setOpenMenuId(null);
  };

  const renderTable = (customerList: Customer[]) => (
    <Card>
      <CardHeader>
        <CardTitle>{activeTab === 'active' ? 'لیست مشتریان فعال' : 'لیست مشتریان بایگانی شده'}</CardTitle>
        <CardDescription>
          {activeTab === 'active' ? 'مشتریان خود را مدیریت کرده و موجودی حسابشان را مشاهده کنید.' : 'این مشتریان در صفحه سفارش نمایش داده نمی‌شوند.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام</TableHead>
              <TableHead>وضعیت حساب (تومان)</TableHead>
              <TableHead className="text-left">
                <span className="sr-only">عملیات</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customerList.map(customer => {
              const balance = customerBalances.get(customer.id) || 0;
              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium align-middle">{customer.name}</TableCell>
                  <TableCell className={cn('align-middle font-semibold', balance < 0 ? 'text-destructive' : balance > 0 ? 'text-green-600' : 'text-muted-foreground')}>
                    {balance === 0 ? '۰' : balance < 0 ? `${Math.abs(balance).toLocaleString('fa-IR')} بدهکار` : `${balance.toLocaleString('fa-IR')} اعتبار`}
                  </TableCell>
                  <TableCell className="text-left">
                    {customer.name !== 'مشتری حضوری' && (
                      <DropdownMenu open={openMenuId === customer.id} onOpenChange={(isOpen) => setOpenMenuId(isOpen ? customer.id : null)}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">باز کردن منو</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {customer.status === 'active' ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/customers/${customer.id}`}><Info className="ml-2 h-4 w-4" /> جزئیات</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDialog('edit', customer)}><Pencil className="ml-2 h-4 w-4" /> ویرایش</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleArchive(customer.id)}><Archive className="ml-2 h-4 w-4" /> بایگانی</DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleRestore(customer.id)}><ArchiveRestore className="ml-2 h-4 w-4" /> بازیابی</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <Trash2 className="ml-2 h-4 w-4" /> حذف دائمی
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>آیا مطمئن هستید؟</AlertDialogTitle>
                                    <AlertDialogDescription>این عمل غیرقابل بازگشت است. فقط در صورتی ادامه دهید که مشتری هیچ سابقه تراکنش یا سفارشی نداشته باشد.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>لغو</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(customer.id)}>تایید و حذف دائمی</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          نمایش <strong>{filteredCustomers.length}</strong> از <strong>{customers.filter(c => c.status === activeTab).length}</strong> مشتری
        </div>
      </CardFooter>
    </Card>
  );
  
  if (!isClient) {
    return (
        <div className="flex flex-col h-full">
            <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="مشتریان" />
            <main className="flex-1 p-4 sm:px-6 sm:py-6">
                <PageHeader title="مشتریان">
                  <Button><PlusCircle className="ml-2 h-4 w-4" /> افزودن مشتری</Button>
                </PageHeader>
                <Card>
                    <CardHeader>
                        <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
                        <div className="text-sm text-muted-foreground">
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </CardHeader>
                    <CardContent>
                       <Table>
                           <TableHeader>
                               <TableRow>
                                   <TableHead>نام</TableHead>
                                   <TableHead>وضعیت حساب (تومان)</TableHead>
                                   <TableHead><span className="sr-only">عملیات</span></TableHead>
                               </TableRow>
                           </TableHeader>
                           <TableBody>
                               <TableRow>
                                   <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                   <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                   <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                               </TableRow>
                                <TableRow>
                                   <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                   <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                   <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                               </TableRow>
                           </TableBody>
                       </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="مشتریان" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="مشتریان">
          <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog('add')}>
                <PlusCircle className="ml-2 h-4 w-4" /> افزودن مشتری
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{dialogState.mode === 'add' ? 'افزودن مشتری جدید' : 'ویرایش مشتری'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">نام</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    className="col-span-3"
                    placeholder="مثال: علی رضایی"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={closeDialog}>لغو</Button>
                <Button type="submit" onClick={handleSaveCustomer}>ذخیره</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="active">فعال</TabsTrigger>
            <TabsTrigger value="archived">بایگانی</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            {renderTable(filteredCustomers)}
          </TabsContent>
          <TabsContent value="archived">
            {renderTable(filteredCustomers)}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
