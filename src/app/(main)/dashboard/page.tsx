'use client';

import { DollarSign, Package, Users, UtensilsCrossed } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Header } from '@/components/header';
import { StatCard } from '@/components/dashboard/stat-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { useMemo, useState, useEffect } from 'react';
import { BestSellers } from '@/components/dashboard/best-sellers';
import { useAppData } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';


export default function DashboardPage() {
    const { orders, products, ingredients } = useAppData();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    const totalRevenue = useMemo(() => {
        if (!orders) return 0;
        return orders.reduce((sum, order) => sum + order.total, 0);
    }, [orders]);
    
    const totalSales = useMemo(() => {
        if (!orders) return 0;
        return orders.length;
    }, [orders]);

    const inventoryValue = useMemo(() => {
        let currentInventoryValue = 0;
        if (products) {
            currentInventoryValue += products.reduce((sum, product) => sum + (product.stock * product.avgBuyPrice), 0);
        }
        if (ingredients) {
            currentInventoryValue += ingredients.reduce((sum, ingredient) => sum + (ingredient.stock * ingredient.avgBuyPrice), 0);
        }
        return currentInventoryValue;
    }, [products, ingredients]);
    

    if (!isClient) {
        return (
            <div className="flex flex-col h-full">
                <Header breadcrumbs={[]} activeBreadcrumb="داشبورد" />
                <main className="flex-1 p-4 sm:px-6 sm:py-6">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-4 w-4" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-8 w-32 mb-2" />
                                    <Skeleton className="h-4 w-20" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                     <div className="mt-8 grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                        <Card className="xl:col-span-2">
                            <CardHeader>
                                <CardTitle>نمای کلی فروش</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <Skeleton className="h-[350px] w-full" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>محصولات پرفروش</CardTitle></CardHeader>
                            <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        );
    }

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="داشبورد" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <StatCard
            title="درآمد کل"
            value={`${totalRevenue.toLocaleString('fa-IR')} تومان`}
            icon={DollarSign}
            description={`${totalSales.toLocaleString('fa-IR')} فروش`}
          />
          <StatCard
            title="سود کل (نمایشی)"
            value="۱۲,۸۷۴,۲۱۰ تومان"
            icon={DollarSign}
            description="در حال حاضر ثابت است"
          />
          <StatCard
            title="ارزش موجودی"
            value={`${inventoryValue.toLocaleString('fa-IR')} تومان`}
            icon={Package}
            description="ارزش کل محصولات و مواد اولیه"
          />
          <StatCard
            title="ارزش ضایعات (نمایشی)"
            value="۸۴۲,۵۰۰ تومان"
            icon={UtensilsCrossed}
            description="در حال حاضر ثابت است"
          />
        </div>
        <div className="mt-8 grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>نمای کلی فروش</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <OverviewChart />
            </CardContent>
          </Card>
          <BestSellers />
        </div>
        <div className="mt-8">
            <Card>
                <CardHeader>
                <CardTitle>فروش‌های اخیر</CardTitle>
                <CardDescription>
                    آخرین سفارشات ثبت شده در سیستم.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <RecentSales />
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
