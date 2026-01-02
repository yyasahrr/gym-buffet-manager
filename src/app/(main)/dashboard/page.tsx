'use client';

import { DollarSign, Package, TrendingUp, Trash2 } from 'lucide-react';
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
import { useState, useEffect } from 'react';
import { BestSellers } from '@/components/dashboard/best-sellers';
import { useAppData } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateMetrics, type Metrics } from '@/lib/metrics';


export default function DashboardPage() {
    const appData = useAppData();
    const [isClient, setIsClient] = useState(false);
    const [metrics, setMetrics] = useState<Metrics>(calculateMetrics(appData));

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (isClient) {
            setMetrics(calculateMetrics(appData));
        }
    }, [appData, isClient]);
    
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
            value={`${(metrics.totalRevenue ?? 0).toLocaleString('fa-IR')} تومان`}
            icon={DollarSign}
            description={`${(metrics.totalSales ?? 0).toLocaleString('fa-IR')} فروش`}
          />
          <StatCard
            title="سود ناخالص"
            value={`${(metrics.grossProfit ?? 0).toLocaleString('fa-IR')} تومان`}
            icon={TrendingUp}
            description="درآمد منهای هزینه اولیه کالا"
          />
           <StatCard
            title="سود خالص"
            value={`${(metrics.netProfit ?? 0).toLocaleString('fa-IR')} تومان`}
            icon={TrendingUp}
            description="سود ناخالص منهای هزینه و ضایعات"
          />
          <StatCard
            title="ارزش موجودی"
            value={`${(metrics.inventoryValue ?? 0).toLocaleString('fa-IR')} تومان`}
            icon={Package}
            description="ارزش کل محصولات و مواد اولیه"
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
