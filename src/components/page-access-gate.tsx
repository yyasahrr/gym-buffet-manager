'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useActiveRole, requiredPermForPath, hasPerm, roleLabel } from '@/lib/rbac';

/**
 * گارد سطح صفحه: بر اساس نقش فعال (که پس از ورود با حساب کاربری روی نقشِ مسئول
 * تنظیم می‌شود) بررسی می‌کند که آیا کاربر دسترسی لازم برای این بخش را دارد یا خیر.
 * نقش‌های بدون دسترسی به‌جای بارگذاری صفحه، صفحهٔ «دسترسی محدود» می‌بینند.
 */
export function PageAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role] = useActiveRole();
  const perm = requiredPermForPath(pathname || '/');

  if (perm && !hasPerm(role, perm)) {
    return (
      <div className="p-6">
        <Card className="mx-auto max-w-md border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" /> دسترسی محدود
            </CardTitle>
            <CardDescription>
              شما (نقش «{roleLabel(role)}») دسترسی لازم برای مشاهدهٔ این بخش را ندارید.
              برای دسترسی به این قسمت باید با حساب کاربریِ مسئول آن وارد شوید.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>بازگشت به داشبورد</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
