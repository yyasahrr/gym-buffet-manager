import Link from 'next/link';
import { ChefHat } from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { AuthGate } from '@/components/auth-gate';
import { PageAccessGate } from '@/components/page-access-gate';
import { ManagementSession } from '@/components/management-session';
import { RoleSwitcher } from '@/components/role-switcher';
import { GlobalSearch } from '@/components/global-search';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar className="border-r">
          <SidebarHeader>
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <ChefHat className="h-6 w-6 text-primary" />
              <span className="text-lg font-headline">بوفه باشگاه</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <MainNav />
          </SidebarContent>
          <SidebarFooter>
            <RoleSwitcher />
            <ManagementSession />
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1">
          <GlobalSearch />
          <AuthGate>
            <PageAccessGate>{children}</PageAccessGate>
          </AuthGate>
        </div>
      </div>
    </SidebarProvider>
  );
}
