import Link from 'next/link';
import { ChefHat } from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
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
          {/* Footer content can go here */}
        </SidebarFooter>
      </Sidebar>
      <div className="flex flex-col flex-1">
        <SidebarInset>{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
