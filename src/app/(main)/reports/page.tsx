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
    <div className="flex flex-col sm:gap-4 sm:py-4">
      <Header breadcrumbs={[]} activeBreadcrumb="Reports" />
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <PageHeader title="Reports" />
        <Card>
            <CardHeader>
                <CardTitle>Usage Report</CardTitle>
                <CardDescription>
                Leverage generative AI to analyze historical data, predicting food usage to reduce waste.
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
