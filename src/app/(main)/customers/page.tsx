'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Wallet } from 'lucide-react';
import { customers as initialCustomers, Customer } from '@/lib/data';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { cn } from '@/lib/utils';

const CUSTOMERS_STORAGE_KEY = 'gym-canteen-customers';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [chargeAmount, setChargeAmount] = useState('');
  
  const { toast } = useToast();

  useEffect(() => {
    const storedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    } else {
      setCustomers(initialCustomers);
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(initialCustomers));
    }
  }, []);
  
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  const handleAddCustomer = () => {
    if (!newCustomerName) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "لطفاً نام مشتری را پر کنید.",
      });
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustomerName,
      balance: 0,
    };

    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(updatedCustomers));
    
    toast({
      title: "موفقیت‌آمیز",
      description: `مشتری "${newCustomerName}" با موفقیت اضافه شد.`,
    });

    setNewCustomerName('');
    setIsAddDialogOpen(false);
  };
  
  const openChargeDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setChargeAmount('');
    setIsChargeDialogOpen(true);
  };

  const handleChargeCredit = () => {
    if (!selectedCustomer || !chargeAmount || parseInt(chargeAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "لطفاً مبلغ معتبری را وارد کنید.",
      });
      return;
    }
    
    const amount = parseInt(chargeAmount, 10);
    const updatedCustomers = customers.map(c => 
      c.id === selectedCustomer.id 
        ? { ...c, balance: c.balance + amount }
        : c
    );
    
    setCustomers(updatedCustomers);
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(updatedCustomers));
    
    toast({
      title: "موفقیت‌آمیز",
      description: `حساب ${selectedCustomer.name} به مبلغ ${amount.toLocaleString('fa-IR')} تومان شارژ شد.`,
    });
    
    setIsChargeDialogOpen(false);
    setSelectedCustomer(null);
  };


  return (
    <div className="flex flex-col h-full">
      <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="مشتریان" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="مشتریان">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="ml-2 h-4 w-4" /> افزودن مشتری
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>افزودن مشتری جدید</DialogTitle>
                <DialogDescription>
                  اطلاعات مشتری جدید را برای افزودن به لیست وارد کنید.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    نام
                  </Label>
                  <Input
                    id="name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="col-span-3"
                    placeholder="مثال: علی رضایی"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsAddDialogOpen(false)}>
                    لغو
                </Button>
                <Button type="submit" onClick={handleAddCustomer}>ذخیره مشتری</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>لیست مشتریان</CardTitle>
            <CardDescription>
              مشتریان خود را مدیریت کرده و موجودی حسابشان را مشاهده کنید.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[64px] sm:table-cell">
                    <span className="sr-only">تصویر</span>
                  </TableHead>
                  <TableHead>نام</TableHead>
                  <TableHead>وضعیت حساب (تومان)</TableHead>
                  <TableHead>
                    <span className="sr-only">عملیات</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map(customer => (
                  <TableRow key={customer.id}>
                    <TableCell className="hidden sm:table-cell align-middle">
                      <Avatar>
                        <AvatarImage
                          src={`https://i.pravatar.cc/40?u=${customer.name}`}
                          alt="Avatar"
                        />
                        <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium align-middle">{customer.name}</TableCell>
                    <TableCell className={cn("align-middle font-semibold", customer.balance < 0 ? 'text-destructive' : 'text-primary')}>
                      {customer.balance < 0 
                        ? `${Math.abs(customer.balance).toLocaleString('fa-IR')} بدهکار` 
                        : `${customer.balance.toLocaleString('fa-IR')} اعتبار`}
                    </TableCell>
                    <TableCell className="align-middle text-left">
                       {customer.name !== 'مشتری حضوری' && (
                        <Button variant="outline" size="sm" onClick={() => openChargeDialog(customer)}>
                            <Wallet className="ml-2 h-4 w-4" />
                            شارژ حساب
                        </Button>
                       )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              نمایش <strong>{filteredCustomers.length}</strong> از <strong>{customers.length}</strong> مشتری
            </div>
          </CardFooter>
        </Card>

        {/* Charge Credit Dialog */}
        <Dialog open={isChargeDialogOpen} onOpenChange={setIsChargeDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>شارژ حساب مشتری</DialogTitle>
                    <DialogDescription>
                        مبلغ مورد نظر برای افزایش اعتبار {selectedCustomer?.name} را وارد کنید.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="charge-amount" className="text-right">
                            مبلغ شارژ (تومان)
                        </Label>
                        <Input
                            id="charge-amount"
                            type="number"
                            value={chargeAmount}
                            onChange={(e) => setChargeAmount(e.target.value)}
                            className="col-span-3"
                            placeholder="مثال: 500000"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">موجودی فعلی</Label>
                        <div className={cn("col-span-3 font-semibold", selectedCustomer && selectedCustomer.balance < 0 ? 'text-destructive' : 'text-primary')}>
                          {selectedCustomer?.balance.toLocaleString('fa-IR')} تومان
                        </div>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">موجودی جدید</Label>
                        <div className="col-span-3 font-bold text-lg">
                          {((selectedCustomer?.balance || 0) + (parseInt(chargeAmount) || 0)).toLocaleString('fa-IR')} تومان
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setIsChargeDialogOpen(false)}>
                        لغو
                    </Button>
                    <Button type="submit" onClick={handleChargeCredit}>تایید و شارژ</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
