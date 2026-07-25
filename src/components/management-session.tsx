'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/lib/store';
import { getSession, logoutSession, type Session } from '@/lib/management-auth';
import { roleLabel } from '@/lib/rbac';
import { UserCircle2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ManagementSession() {
  const { account } = useAppData();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  if (!account?.requireManagementAuth || !session) return null;

  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-sm">
      <UserCircle2 className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1 leading-tight">
        <p className="font-medium">{session.name}</p>
        <p className="text-xs text-muted-foreground">
          {roleLabel(session.role)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        title="خروج"
        onClick={() => {
          logoutSession();
          router.push('/login');
        }}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
