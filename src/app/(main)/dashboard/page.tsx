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

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="داشبورد" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <StatCard
            title="درآمد کل"
            value="۴۵,۲۳۱,۸۹۰ تومان"
            icon={DollarSign}
            description="۲۰.۱٪+ نسبت به ماه گذشته"
          />
          <StatCard
            title="سود کل"
            value="۱۲,۸۷۴,۲۱۰ تومان"
            icon={DollarSign}
            description="۱۸.۳٪+ نسبت به ماه گذشته"
          />
          <StatCard
            title="ارزش موجودی"
            value="۲۳,۴۵۰,۰۰۰ تومان"
            icon={Package}
            description="بر اساس میانگین قیمت خرید"
          />
          <StatCard
            title="ارزش ضایعات"
            value="۸۴۲,۵۰۰ تومان"
            icon={UtensilsCrossed}
            description="در این ماه"
          />
        </div>
        <div className="mt-8 grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>نمای کلی</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <OverviewChart />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>فروش‌های اخیر</CardTitle>
              <CardDescription>
                شما در این ماه ۲۶۵ فروش داشته‌اید.
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
