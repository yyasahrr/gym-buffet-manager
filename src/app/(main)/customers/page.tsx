import { PlusCircle } from 'lucide-react';
import { customers } from '@/lib/data';
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
import { cn } from '@/lib/utils';

export default function CustomersPage() {
  return (
    <div className="flex flex-col sm:gap-4 sm:py-4">
      <Header breadcrumbs={[]} activeBreadcrumb="مشتریان" />
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <PageHeader title="مشتریان">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> افزودن مشتری
            </Button>
        </PageHeader>
        <Card>
            <CardHeader>
                <CardTitle>لیست مشتریان</CardTitle>
                <CardDescription>مشتریان خود را مدیریت کرده و موجودی حسابشان را مشاهده کنید.</CardDescription>
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
                        <TableCell className="hidden sm:table-cell">
                             <Avatar>
                                <AvatarImage src={`https://i.pravatar.cc/40?u=${customer.name}`} alt="Avatar" />
                                <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                           <Badge variant={customer.balance >= 0 ? 'outline' : 'destructive'} className={cn(customer.balance < 0 && 'text-destructive')}>
                               {customer.balance.toLocaleString('fa-IR')} تومان
                           </Badge>
                        </TableCell>
                        <TableCell>{customer.creditLimit.toLocaleString('fa-IR')} تومان</TableCell>
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
