import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import ReportClient from '@/components/reports/report-client';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <>
      <Header breadcrumbs={[]} activeBreadcrumb="گزارشات" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="گزارشات" />
        <Card>
            <CardHeader>
                <CardTitle>گزارش مصرف</CardTitle>
                <CardDescription>
                از هوش مصنوعی مولد برای تحلیل داده‌های تاریخی و پیش‌بینی مصرف غذا برای کاهش ضایعات استفاده کنید.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ReportClient />
            </CardContent>
        </Card>
      </main>
    </>
  );
}
