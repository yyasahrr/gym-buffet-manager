'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppData } from '@/lib/store';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Search, Package, Users, CalendarCheck, ShoppingCart, LayoutDashboard, Calculator, LineChart, Settings, Store, Receipt, Building2, CalendarDays, Wallet, Scale, LifeBuoy } from 'lucide-react';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { products, customers, memberships, membershipPlans, orders } = useAppData();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const productItems = (products || []).filter((p) => p.status === 'active').slice(0, 8).map((p) => ({
    id: p.id, label: `محصول: ${p.name}`, icon: <Package className="h-4 w-4" />, run: () => go('/products'),
  }));
  const customerItems = (customers || []).filter((c) => c.status === 'active').slice(0, 8).map((c) => ({
    id: c.id, label: `مشتری: ${c.name}`, icon: <Users className="h-4 w-4" />, run: () => go('/customers'),
  }));
  const membershipItems = (memberships || []).slice(0, 8).map((m) => ({
    id: m.id, label: `عضویت: ${membershipPlans.find((p) => p.id === m.planId)?.name || 'پلن'}`, icon: <CalendarCheck className="h-4 w-4" />, run: () => go('/memberships'),
  }));

  const pages = [
    { id: 'dash', label: 'رفتن به داشبورد', icon: <LayoutDashboard className="h-4 w-4" />, run: () => go('/dashboard') },
    { id: 'pos', label: 'رفتن به فروشگاه (POS)', icon: <Store className="h-4 w-4" />, run: () => go('/pos') },
    { id: 'orders', label: 'رفتن به سفارشات', icon: <ShoppingCart className="h-4 w-4" />, run: () => go('/orders') },
    { id: 'cashier', label: 'رفتن به گزارش صندوق‌داری', icon: <Calculator className="h-4 w-4" />, run: () => go('/cashier') },
    { id: 'reports', label: 'رفتن به گزارشات', icon: <LineChart className="h-4 w-4" />, run: () => go('/reports') },
    { id: 'memberships', label: 'رفتن به عضویت‌ها', icon: <CalendarCheck className="h-4 w-4" />, run: () => go('/memberships') },
    { id: 'expenses', label: 'رفتن به هزینه‌ها', icon: <Receipt className="h-4 w-4" />, run: () => go('/expenses') },
    { id: 'ledgers', label: 'رفتن به دفتر دوگانه', icon: <Scale className="h-4 w-4" />, run: () => go('/ledgers') },
    { id: 'rental', label: 'رفتن به اجاره‌داری', icon: <Building2 className="h-4 w-4" />, run: () => go('/rental') },
    { id: 'booking', label: 'رفتن به رزرو و کلاس‌ها', icon: <CalendarDays className="h-4 w-4" />, run: () => go('/booking') },
    { id: 'hrm', label: 'رفتن به منابع انسانی', icon: <Wallet className="h-4 w-4" />, run: () => go('/hrm') },
    { id: 'trainers', label: 'رفتن به نمایش مربیان', icon: <Users className="h-4 w-4" />, run: () => go('/trainers') },
    { id: 'help', label: 'رفتن به پشتیبانی / تیکت‌ها', icon: <LifeBuoy className="h-4 w-4" />, run: () => go('/help-desk') },
    { id: 'settings', label: 'رفتن به تنظیمات', icon: <Settings className="h-4 w-4" />, run: () => go('/settings') },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        aria-label="جستجوی سراسری"
      >
        <Search className="h-4 w-4" />
        <span>جستجو...</span>
        <kbd className="ml-2 rounded border bg-muted px-1.5 text-[10px]">Ctrl K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="جستجوی مشتری، محصول، عضویت یا صفحه..." />
        <CommandList>
          <CommandEmpty>موردی یافت نشد.</CommandEmpty>
          <CommandGroup heading="صفحات">
            {pages.map((p) => (
              <CommandItem key={p.id} value={p.label} onSelect={p.run}>{p.icon}{p.label}</CommandItem>
            ))}
          </CommandGroup>
          {membershipItems.length > 0 && (
            <CommandGroup heading="عضویت‌ها">
              {membershipItems.map((m) => (
                <CommandItem key={m.id} value={m.label} onSelect={m.run}>{m.icon}{m.label}</CommandItem>
              ))}
            </CommandGroup>
          )}
          {customerItems.length > 0 && (
            <CommandGroup heading="مشتریان">
              {customerItems.map((c) => (
                <CommandItem key={c.id} value={c.label} onSelect={c.run}>{c.icon}{c.label}</CommandItem>
              ))}
            </CommandGroup>
          )}
          {productItems.length > 0 && (
            <CommandGroup heading="محصولات">
              {productItems.map((p) => (
                <CommandItem key={p.id} value={p.label} onSelect={p.run}>{p.icon}{p.label}</CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
