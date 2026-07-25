'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppData } from '@/lib/store';
import { isAuthed } from '@/lib/management-auth';
import { Loader2 } from 'lucide-react';

/**
 * Client-side guard for the management area. When the business has enabled
 * "نیاز به احراز هویت مدیریت", every (main) route redirects to /login unless a
 * management session exists. The /login route itself is exempt.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { account, users } = useAppData();
  const [ready, setReady] = useState(false);

  const required = !!account?.requireManagementAuth || (users?.length || 0) > 0;
  const onLogin = pathname?.startsWith('/login');

  useEffect(() => {
    setReady(true);
    if (required && !isAuthed() && !onLogin) {
      router.replace('/login');
    }
  }, [required, onLogin, router]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (required && !isAuthed() && !onLogin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
