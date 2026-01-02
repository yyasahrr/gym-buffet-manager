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
import { Badge } from '@/components/ui/badge';
import { recentOrders } from '@/lib/data';
import { format } from 'date-fns-jalali';

export default function ReportsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="گزارشات" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="گزارشات تراکنش" />
        <Card>
            <CardHeader>
                <CardTitle>تاریخچه سفارشات</CardTitle>
                <CardDescription>
                  لیست تمام تراکنش‌ها و سفارشات اخیر را مشاهده کنید.
                </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>مشتری</TableHead>
                    <TableHead>موارد سفارش</TableHead>
                    <TableHead>مبلغ کل</TableHead>
                    <TableHead>وضعیت پرداخت</TableHead>
                    <TableHead>تاریخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.customerName}</TableCell>
                      <TableCell>{order.items.map(i => `${i.item.name} (x${i.quantity})`).join(', ')}</TableCell>
                      <TableCell>{order.total.toLocaleString('fa-IR')} تومان</TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'پرداخت شده' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(order.createdAt), 'yyyy/MM/dd HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
