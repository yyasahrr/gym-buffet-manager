
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
  Receipt,
  Truck,
  Trash2,
  Settings,
  CircleUser,
  LifeBuoy,
} from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const mainLinks = [
  { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/orders', label: 'سفارشات', icon: ShoppingCart },
  { href: '/products', label: 'محصولات', icon: Package },
  { href: '/ingredients', label: 'مواد اولیه', icon: Leaf },
  { href: '/purchases', label: 'خرید', icon: Truck },
  { href: '/recipes', label: 'دستور پخت‌ها', icon: ChefHat },
  { href: '/waste', label: 'ضایعات', icon: Trash2 },
  { href: '/reports', label: 'گزارشات', icon: LineChart },
  { href: '/customers', label: 'مشتریان', icon: Users },
  { href: '/expenses', label: 'هزینه‌ها', icon: Receipt },
];

const accountLinks = [
    { href: '/account', label: 'حساب کاربری', icon: CircleUser },
    { href: '/settings', label: 'تنظیمات', icon: Settings },
    { href: '/support', label: 'پشتیبانی', icon: LifeBuoy },
];

export function MainNav() {
  const pathname = usePathname();

  const renderLinks = (links: {href:string, label:string, icon: React.ElementType}[]) => {
    return links.map((link) => {
        const isActive = pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard');
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
      });
  }

  return (
    <>
        <SidebarMenu>
            {renderLinks(mainLinks)}
        </SidebarMenu>
        <SidebarMenu className="mt-auto">
            {renderLinks(accountLinks)}
        </SidebarMenu>
    </>
  );
}
