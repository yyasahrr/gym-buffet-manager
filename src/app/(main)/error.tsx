'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { dataStore } from '@/lib/store';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const handleFullReset = () => {
    // This is a destructive action, but it's a last resort recovery mechanism.
    dataStore.resetData();
    // After resetting, we need to force a reload to re-initialize the app state
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Card className="w-[450px] text-center">
            <CardHeader>
                <CardTitle className="text-2xl">خطای غیرمنتظره رخ داد</CardTitle>
                <CardDescription>متاسفانه مشکلی در برنامه پیش آمده است.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">می‌توانید دوباره امتحان کنید یا در صورت تکرار مشکل، داده‌های برنامه را بازنشانی کنید.</p>
                {error?.message && (
                    <details className="mt-4 p-2 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-left">
                        <summary className="cursor-pointer text-destructive text-right">جزئیات خطا</summary>
                        <pre className="mt-2 whitespace-pre-wrap font-code">{error.message}</pre>
                        {error.stack && <pre className="mt-2 whitespace-pre-wrap font-code">{error.stack}</pre>}
                    </details>
                )}
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
                <Button onClick={() => reset()}>دوباره امتحان کنید</Button>
                <Button variant="destructive" onClick={handleFullReset}>ریست کامل داده‌ها</Button>
            </CardFooter>
        </Card>
    </div>
  );
}
