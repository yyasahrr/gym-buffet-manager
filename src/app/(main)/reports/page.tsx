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
import { Badge } from '@/components/ui/badge';
import { Order } from '@/lib/types';
import { format } from 'date-fns-jalali';
import { useState, useMemo } from 'react';
import { useAppData } from '@/lib/store';

export default function ReportsPage() {
  const { orders } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order =>
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(i => i.item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [orders, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="گزارشات" />
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
                  {filteredOrders.map(order => (
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
