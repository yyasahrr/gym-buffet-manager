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
  CupSoda,
  CalendarCheck,
  LogIn,
  ChevronLeft,
  Store,
  Dumbbell,
  ShoppingBag,
  Calculator,
  ScrollText,
  Activity,
  Building2,
  CalendarDays,
  Wallet,
  Scale,
  ShieldCheck,
  Network,
  UserCheck,
} from 'lucide-react';

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useActiveRole, hasPerm, type Permission } from '@/lib/rbac';

type NavLink = { href: string; label: string; icon: React.ElementType; perm?: Permission };
type NavGroup = { id: string; label: string; icon: React.ElementType; links: NavLink[] };

const buffetGroup: NavGroup = {
  id: 'buffet',
  label: 'بوفه (POS / فروشگاه)',
  icon: Store,
  links: [
    { href: '/pos', label: 'فروشگاه (POS)', icon: ShoppingBag, perm: 'pos.view' },
    { href: '/orders', label: 'سفارشات', icon: ShoppingCart, perm: 'pos.view' },
    { href: '/products', label: 'محصولات', icon: Package, perm: 'inventory.view' },
    { href: '/ingredients', label: 'مواد اولیه', icon: Leaf, perm: 'inventory.view' },
    { href: '/purchases', label: 'خرید', icon: Truck, perm: 'inventory.view' },
    { href: '/consumables', label: 'مصرفی‌ها', icon: CupSoda, perm: 'inventory.view' },
    { href: '/recipes', label: 'دستور پخت‌ها', icon: ChefHat, perm: 'inventory.view' },
    { href: '/waste', label: 'ضایعات', icon: Trash2, perm: 'inventory.view' },
    { href: '/reports', label: 'گزارشات', icon: LineChart, perm: 'reports.view' },
    { href: '/cashier', label: 'گزارش صندوق‌داری', icon: Calculator, perm: 'cashier.view' },
  ],
};

const gymGroup: NavGroup = {
  id: 'gym',
  label: 'باشگاه (CRM / عضویت)',
  icon: Dumbbell,
  links: [
    { href: '/memberships', label: 'عضویت‌ها', icon: CalendarCheck, perm: 'members.view' },
    { href: '/customers', label: 'مشتریان (CRM)', icon: Users, perm: 'crm.view' },
    { href: '/rental', label: 'اجاره‌داری', icon: Building2, perm: 'rental.view' },
    { href: '/booking', label: 'رزرو و کلاس‌ها', icon: CalendarDays, perm: 'booking.view' },
    { href: '/attendance', label: 'حضور و غیاب', icon: CalendarCheck, perm: 'attendance.view' },
    { href: '/trainer', label: 'پنل مربی', icon: Dumbbell, perm: 'trainer.panel' },
    { href: '/hrm', label: 'منابع انسانی', icon: Wallet, perm: 'trainers.view' },
    { href: '/trainers', label: 'نمایش مربیان', icon: Users, perm: 'trainers.view' },
    { href: '/portal-console', label: 'نمایشگر پورتال', icon: Activity, perm: 'portal.view' },
    { href: '/trainer-marketplace', label: 'بازار مربیان و رزرو', icon: Network, perm: 'portal.view' },
    { href: '/trainer-wallet', label: 'کیف پول مربی', icon: Wallet, perm: 'trainer.panel' },
    { href: '/trainer-plans', label: 'سازنده برنامه‌ها', icon: Dumbbell, perm: 'trainer.panel' },
    { href: '/trainer-profile', label: 'پروفایل مربی', icon: Users, perm: 'trainer.panel' },
    { href: '/trainer-availability', label: 'زمان‌های آزاد مربی', icon: CalendarDays, perm: 'trainer.panel' },
    { href: '/trainer-settlements', label: 'تسویه مربیان', icon: Receipt, perm: 'finance.view' },
    { href: '/trainer-approvals', label: 'تأیید مربیان', icon: UserCheck, perm: 'users.view' },
    { href: '/customer/login', label: 'ورود مشتری', icon: LogIn, perm: 'portal.view' },
  ],
};

const accountingGroup: NavGroup = {
  id: 'accounting',
  label: 'حسابداری (دو دفتره)',
  icon: Scale,
  links: [
    { href: '/expenses', label: 'هزینه‌ها', icon: Receipt, perm: 'finance.view' },
    { href: '/ledgers', label: 'دفتر دوگانه', icon: Scale, perm: 'finance.view' },
  ],
};

const topLinks: NavLink[] = [
  { href: '/dashboard', label: 'داشبورد', icon: LayoutDashboard, perm: 'dashboard.view' },
];

const accountLinks: NavLink[] = [
  { href: '/account', label: 'حساب کاربری', icon: CircleUser },
  { href: '/users', label: 'کاربران و دسترسی‌ها', icon: Users, perm: 'users.view' },
  { href: '/audit', label: 'لاگ فعالیت', icon: ScrollText, perm: 'audit.view' },
  { href: '/help-desk', label: 'پشتیبانی / تیکت‌ها', icon: LifeBuoy, perm: 'helpdesk.view' },
  { href: '/settings', label: 'تنظیمات', icon: Settings, perm: 'settings.write' },
  { href: '/compliance', label: 'انطباق، سانس و اشتراک', icon: ShieldCheck, perm: 'settings.write' },
  { href: '/support', label: 'درباره و تماس', icon: LifeBuoy },
];

function isActive(pathname: string, href: string) {
  return (
    pathname === href ||
    (href !== '/dashboard' && pathname.startsWith(href))
  );
}

function NavGroupCollapsible({ group, role }: { group: NavGroup; role: ReturnType<typeof useActiveRole>[0] }) {
  const pathname = usePathname();
  const visible = group.links.filter((l) => !l.perm || hasPerm(role, l.perm));
  if (visible.length === 0) return null;
  const groupActive = visible.some((l) => isActive(pathname, l.href));

  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={groupActive} tooltip={group.label}>
            <group.icon />
            <span>{group.label}</span>
            <ChevronLeft className="mr-auto transition-transform duration-200 group-data-[state=open]/collapsible:-rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {visible.map((link) => (
              <SidebarMenuSubItem key={link.href}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isActive(pathname, link.href)}
                >
                  <Link href={link.href}>
                    <link.icon />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function NavSingleLink({ link, role }: { link: NavLink; role: ReturnType<typeof useActiveRole>[0] }) {
  const pathname = usePathname();
  if (link.perm && !hasPerm(role, link.perm)) return null;
  const active = isActive(pathname, link.href);
  return (
    <SidebarMenuItem key={link.href}>
      <Link href={link.href}>
        <SidebarMenuButton isActive={active} tooltip={link.label}>
          <link.icon />
          <span>{link.label}</span>
        </SidebarMenuButton>
      </Link>
    </SidebarMenuItem>
  );
}

export function MainNav() {
  const [role] = useActiveRole();
  return (
    <>
      <SidebarMenu>
        {topLinks.map((link) => (
          <NavSingleLink key={link.href} link={link} role={role} />
        ))}
        <NavGroupCollapsible group={buffetGroup} role={role} />
        <NavGroupCollapsible group={gymGroup} role={role} />
        <NavGroupCollapsible group={accountingGroup} role={role} />
      </SidebarMenu>
      <SidebarMenu className="mt-auto">
        {accountLinks.map((link) => (
          <NavSingleLink key={link.href} link={link} role={role} />
        ))}
      </SidebarMenu>
    </>
  );
}
