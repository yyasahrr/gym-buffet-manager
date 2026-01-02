
'use client';

import { useAppData } from '@/lib/store';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SupportPage() {
  const { account } = useAppData();

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="پشتیبانی" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="پشتیبانی و اطلاعات برنامه" />

        <div className="max-w-2xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>تماس با ما</CardTitle>
                    <CardDescription>برای دریافت پشتیبانی یا ارائه پیشنهادات می‌توانید از راه‌های زیر با ما در ارتباط باشید.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><strong>ایمیل:</strong> support@example.com</p>
                    <p><strong>تلفن:</strong> 021-12345678</p>
                    <p>ساعات پاسخگویی: شنبه تا چهارشنبه از ساعت ۹ صبح تا ۵ عصر</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>اطلاعات نسخه</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                    <p>شما در حال استفاده از نسخه <strong>{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}</strong> از نرم‌افزار مدیریت بوفه هستید.</p>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
