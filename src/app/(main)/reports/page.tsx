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
import { useState, useMemo, useEffect } from 'react';
import { useAppData } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsPage() {
  const { orders } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order =>
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(i => i.item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, searchQuery]);
  
  const renderTable = () => (
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
              {filteredOrders.length > 0 ? filteredOrders.map(order => (
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
              )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                        سفارشی یافت نشد.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
    </Card>
  );

  const renderSkeleton = () => (
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
                <TableRow>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                </TableRow>
                 <TableRow>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                </TableRow>
            </TableBody>
          </Table>
        </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="گزارشات" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="گزارشات تراکنش" />
        {isClient ? renderTable() : renderSkeleton()}
      </main>
    </div>
  );
}
