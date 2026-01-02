'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Order } from '@/lib/types';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { format } from 'date-fns-jalali';

const ORDERS_STORAGE_KEY = 'gym-canteen-orders';

const getMonthName = (month: number) => {
  const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  return monthNames[month];
}

export function OverviewChart() {
  const [data, setData] = useState<{name: string; total: number}[]>([]);

  useEffect(() => {
    const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (storedOrders) {
      const orders: Order[] = JSON.parse(storedOrders);
      
      const monthlySales: { [key: string]: number } = {};

      orders.forEach(order => {
        const date = new Date(order.createdAt);
        // Using format to get Persian month name correctly. The 'M' gives month number 1-12.
        const monthName = format(date, 'MMMM');
        
        if (monthlySales[monthName]) {
          monthlySales[monthName] += order.total;
        } else {
          monthlySales[monthName] = order.total;
        }
      });

      // Ensure all 12 months are present
      const allMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
      const chartData = allMonths.map(monthName => ({
        name: monthName,
        total: monthlySales[monthName] || 0,
      }));

      setData(chartData);

    } else {
        // Create dummy data if no orders exist
        const allMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
        const chartData = allMonths.map(monthName => ({
            name: monthName,
            total: 0,
        }));
        setData(chartData);
    }
  }, []);

  if (data.length === 0) {
    return (
        <div className="flex items-center justify-center h-[350px]">
            <p className="text-muted-foreground">داده‌ای برای نمایش وجود ندارد.</p>
        </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${new Intl.NumberFormat('fa-IR').format(Number(value))}`}
        />
        <Tooltip
            cursor={{ fill: 'hsla(var(--muted), 0.5)' }}
            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', direction: 'rtl' }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value) => [`${Number(value).toLocaleString('fa-IR')} تومان`, 'فروش']}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
