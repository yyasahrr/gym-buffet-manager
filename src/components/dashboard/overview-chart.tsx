'use client';

import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns-jalali';
import { useAppData } from '@/lib/store';

export function OverviewChart() {
  const { orders } = useAppData();

  const data = useMemo(() => {
    const monthlySales: { [key: string]: number } = {};
    const allMonths = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
      
    if (orders) {
        orders.forEach(order => {
            const date = new Date(order.createdAt);
            const monthName = format(date, 'MMMM');
            
            if (monthlySales[monthName]) {
            monthlySales[monthName] += order.total;
            } else {
            monthlySales[monthName] = order.total;
            }
        });
    }

    return allMonths.map(monthName => ({
      name: monthName,
      total: monthlySales[monthName] || 0,
    }));

  }, [orders]);


  if (data.every(d => d.total === 0)) {
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
