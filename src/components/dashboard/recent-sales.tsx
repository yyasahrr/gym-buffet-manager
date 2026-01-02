
'use client';

import { useMemo } from 'react';
import { useAppData } from '@/lib/store';
import { User } from 'lucide-react';


export function RecentSales() {
    const { orders: allOrders } = useAppData();

    const recentOrders = useMemo(() => {
        if (!allOrders) return [];
        return [...allOrders]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
    }, [allOrders]);

    if(recentOrders.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">هنوز سفارشی ثبت نشده است.</p>
    }

  return (
    <div className="space-y-8">
        {recentOrders.map((order) => (
            <div key={order.id} className="flex items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mr-4 space-y-1">
                <p className="text-sm font-medium leading-none">{order.customerName}</p>
                <p className="text-sm text-muted-foreground">
                    {order.items.map(i => i.item.name).join(', ')}
                </p>
                </div>
                <div className="ml-auto font-medium">+{order.total.toLocaleString('fa-IR')} تومان</div>
            </div>
        ))}
    </div>
  );
}
