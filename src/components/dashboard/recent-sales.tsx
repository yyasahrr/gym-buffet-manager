import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { recentOrders } from '@/lib/data';

export function RecentSales() {
  return (
    <div className="space-y-8">
        {recentOrders.map((order, index) => (
            <div key={order.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                <AvatarImage src={`https://i.pravatar.cc/40?u=${order.customerName}`} alt="Avatar" />
                <AvatarFallback>{order.customerName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{order.customerName}</p>
                <p className="text-sm text-muted-foreground">
                    {order.items.map(i => i.item.name).join(', ')}
                </p>
                </div>
                <div className="ml-auto font-medium">+${order.total.toFixed(2)}</div>
            </div>
        ))}
    </div>
  );
}
