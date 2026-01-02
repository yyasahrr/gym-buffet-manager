'use client';

import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const CUSTOMERS_STORAGE_KEY = 'gym-canteen-customers';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerCredit, setNewCustomerCredit] = useState('');
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const storedCustomers = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    } else {
      setCustomers(initialCustomers);
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(initialCustomers));
    }
  }, []);

  const handleAddCustomer = () => {
    if (!newCustomerName || !newCustomerCredit) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "لطفاً تمام فیلدها را پر کنید.",
      });
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: newCustomerName,
      balance: 0,
      creditLimit: parseInt(newCustomerCredit, 10),
    };

    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(updatedCustomers));
    
    toast({
      title: "موفقیت‌آمیز",
      description: `مشتری "${newCustomerName}" با موفقیت اضافه شد.`,
    });

    setNewCustomerName('');
    setNewCustomerCredit('');
    setIsDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="مشتریان" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="مشتریان">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="credit" className="text-right">
                    سقف اعتبار
                  </Label>
                  <Input
                    id="credit"
                    type="number"
                    value={newCustomerCredit}
                    onChange={(e) => setNewCustomerCredit(e.target.value)}
                    className="col-span-3"
                    placeholder="مثال: 1000000"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
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
                  <TableHead>موجودی</TableHead>
                  <TableHead>سقف اعتبار</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map(customer => (
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
                    <TableCell className="align-middle">
                      <Badge variant={customer.balance >= 0 ? 'outline' : 'destructive'}>
                        {customer.balance.toLocaleString('fa-IR')} تومان
                      </Badge>
                    </TableCell>
                    <TableCell className="align-middle">
                      {customer.creditLimit.toLocaleString('fa-IR')} تومان
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              نمایش <strong>1-{customers.length}</strong> از <strong>{customers.length}</strong> مشتری
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
