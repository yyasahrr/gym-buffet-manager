'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Order, OrderItem, Product, Food } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAppData } from '@/lib/store';

type SalesCount = {
  id: string;
  name: string;
  count: number;
};

export function BestSellers() {
  const { orders } = useAppData();

  const bestSellers = useMemo(() => {
    if (!orders) return [];

    const salesCount: { [key: string]: SalesCount } = {};

    orders.forEach(order => {
      order.items.forEach(orderItem => {
        const { item, quantity } = orderItem;
        if (salesCount[item.id]) {
          salesCount[item.id].count += quantity;
        } else {
          salesCount[item.id] = {
            id: item.id,
            name: item.name,
            count: quantity,
          };
        }
      });
    });

    return Object.values(salesCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
  }, [orders]);

  if (bestSellers.length === 0) {
    return (
        <Card>
        <CardHeader>
          <CardTitle>محصولات پرفروش</CardTitle>
          <CardDescription>
            پرفروش‌ترین محصولات این ماه.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-center text-muted-foreground py-8">هنوز سفارشی ثبت نشده است.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>محصولات پرفروش</CardTitle>
        <CardDescription>
            پرفروش‌ترین محصولات در تمام سفارشات.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>محصول</TableHead>
              <TableHead className="text-right">تعداد فروش</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bestSellers.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right font-semibold">{item.count.toLocaleString('fa-IR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
