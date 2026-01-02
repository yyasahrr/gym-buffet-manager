'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Leaf,
  ChefHat,
  LineChart,
  Users,
} from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const links = [
  { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/orders', label: 'سفارشات', icon: ShoppingCart },
  { href: '/products', label: 'محصولات', icon: Package },
  { href: '/ingredients', label: 'مواد اولیه', icon: Leaf },
  { href: '/recipes', label: 'دستور پخت‌ها', icon: ChefHat },
  { href: '/reports', label: 'گزارشات', icon: LineChart },
  { href: '/customers', label: 'مشتریان', icon: Users },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <SidebarMenuItem key={link.href}>
            <Link href={link.href}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={link.label}
              >
                  <link.icon />
                  <span>{link.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
