'use client';

import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { format as formatJalali } from 'date-fns-jalali';
import { useAppData } from '@/lib/store';

// Helper to get Jalali month names
const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const getJalaliMonthName = (date: Date): string => {
  const monthIndex = parseInt(formatJalali(date, 'M'), 10) - 1;
  return JALALI_MONTHS[monthIndex];
};


export function OverviewChart() {
  const { orders } = useAppData();

  const data = useMemo(() => {
    const monthlySales: { [key: string]: number } = {};
      
    if (orders) {
        orders.forEach(order => {
            const date = new Date(order.createdAt);
            const monthName = getJalaliMonthName(date);
            
            if (monthlySales[monthName]) {
              monthlySales[monthName] += order.total;
            } else {
              monthlySales[monthName] = order.total;
            }
        });
    }

    return JALALI_MONTHS.map(monthName => ({
      name: monthName,
      total: monthlySales[monthName] || 0,
    }));

  }, [orders]);


  if (!orders || orders.length === 0) {
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
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${new Intl.NumberFormat('fa-IR').format(Number(value) / 1000000)}م`}
          label={{ value: "میلیون تومان", angle: -90, position: 'insideLeft', offset: 0, style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 12 } }}
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
