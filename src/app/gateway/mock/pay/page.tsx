'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function MockGatewayInner() {
  const sp = useSearchParams();
  const authority = sp.get('authority') || '';
  const amount = sp.get('amount') || '0';
  const cb = sp.get('cb') || '/api/payments/callback';

  const go = (status: 'OK' | 'NONE') => {
    const sep = cb.includes('?') ? '&' : '?';
    window.location.href = `${cb}${sep}authority=${encodeURIComponent(authority)}&status=${status}`;
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>درگاه پرداخت (شبیه‌سازی‌شده)</CardTitle>
          <p className="text-xs text-muted-foreground">این یک محیط تست است و هیچ وجهی واقعی کسر نمی‌شود.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-background p-4 text-center">
            <p className="text-sm text-muted-foreground">مبلغ قابل پرداخت</p>
            <p className="text-2xl font-bold">{Number(amount).toLocaleString('fa-IR')} تومان</p>
          </div>
          <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => go('OK')}>پرداخت موفق</Button>
          <Button className="w-full" variant="outline" onClick={() => go('NONE')}>انصراف</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MockGatewayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">در حال بارگذاری درگاه…</div>}>
      <MockGatewayInner />
    </Suspense>
  );
}
