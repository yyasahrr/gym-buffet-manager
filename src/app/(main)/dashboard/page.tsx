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
import ReportClient from '@/components/reports/report-client';

export default function DashboardPage() {
  return (
    <div className="flex flex-col sm:gap-4 sm:py-4">
      <Header breadcrumbs={[]} activeBreadcrumb="Dashboard" />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value="$45,231.89"
            icon={DollarSign}
            description="+20.1% from last month"
          />
          <StatCard
            title="Total Profit"
            value="$12,874.21"
            icon={DollarSign}
            description="+18.3% from last month"
          />
          <StatCard
            title="Stock Value"
            value="$23,450"
            icon={Package}
            description="Based on avg. buy price"
          />
          <StatCard
            title="Waste Value"
            value="$842.50"
            icon={UtensilsCrossed}
            description="This month"
          />
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <OverviewChart />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>
                You made 265 sales this month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentSales />
            </CardContent>
          </Card>
        </div>
        <Card>
            <CardHeader>
              <CardTitle>Usage Report</CardTitle>
              <CardDescription>
                Generate an AI-powered report to analyze historical data and predict food usage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportClient />
            </CardContent>
          </Card>
      </main>
    </div>
  );
}
