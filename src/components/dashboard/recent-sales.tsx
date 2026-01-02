'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Order } from '@/lib/types';
import { useMemo } from 'react';
import { useAppData } from '@/lib/store';


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
                <Avatar className="h-9 w-9">
                <AvatarImage src={`https://i.pravatar.cc/40?u=${order.customerName}`} alt="Avatar" />
                <AvatarFallback>{order.customerName.charAt(0)}</AvatarFallback>
                </Avatar>
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
