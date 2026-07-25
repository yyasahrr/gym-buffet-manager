'use client';

import Link from 'next/link';
import { Package, TrendingUp, CreditCard, AlertTriangle, Gift, CalendarClock, Rocket, Store, Dumbbell, Building2, Wallet, CalendarDays, LifeBuoy, ClipboardList, Users, Receipt, Scale, Wrench } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Header } from '@/components/header';
import { StatCard } from '@/components/dashboard/stat-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { BestSellers } from '@/components/dashboard/best-sellers';
import { SetupWizard } from '@/components/setup-wizard';
import { useState, useEffect } from 'react';
import { useAppData } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateMetrics, rentalIncomeMonth, payrollMonth, isBuffetLeased, type Metrics } from '@/lib/metrics';
import { daysUntil, computeInvoiceStatus } from '@/lib/membership';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActiveRole, roleLabel, viewableBooks } from '@/lib/rbac';

function birthdaysInRange(items: { birthDate?: string; name: string; id: string }[], days: number, now = new Date()) {
  return items.filter((c) => c.birthDate).map((c) => {
    const b = new Date(c.birthDate!);
    const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
    if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next.setFullYear(now.getFullYear() + 1);
    const d = Math.round((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { ...c, inDays: d };
  }).filter((c) => c.inDays >= 0 && c.inDays <= days);
}

export default function DashboardPage() {
    const appData = useAppData();
    const [isClient, setIsClient] = useState(false);
    const [metrics, setMetrics] = useState<Metrics>(calculateMetrics(appData));
    const [setupOpen, setSetupOpen] = useState(false);
    const [role] = useActiveRole();

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        setSetupOpen(!appData.account?.setupComplete);
    }, [appData.account?.setupComplete]);

    useEffect(() => {
        if (isClient) {
            setMetrics(calculateMetrics(appData));
        }
    }, [appData, isClient]);

    const { products, ingredients, memberships, membershipInvoices, customers, account } = appData;
    const threshold = account?.lowStockThreshold || 10;

    const lowStock = [
      ...(ingredients || []).filter((i) => i.status !== 'archived' && i.stock <= threshold).map((i) => ({ kind: 'ماده اولیه', name: i.name, stock: i.stock })),
      ...(products || []).filter((p) => p.status !== 'archived' && p.stock <= threshold).map((p) => ({ kind: 'محصول', name: p.name, stock: p.stock })),
    ];

    const expiring = (memberships || []).filter((m) => m.status === 'active' && daysUntil(m.endDate) >= 0 && daysUntil(m.endDate) <= 7);
    const upcomingBirthdays = birthdaysInRange((customers || []).filter((c) => c.status === 'active'), 7);

    const gymIssued = (membershipInvoices || []).reduce((s, i) => s + i.total, 0);
    const gymOverdue = (membershipInvoices || []).filter((i) => computeInvoiceStatus(i) === 'overdue' || (i.isInstallment ? i.installments.some((ins) => !ins.paid && new Date(ins.dueDate) < new Date()) : false));
    const gymOverdueAmount = gymOverdue.reduce((s, i) => s + Math.max(0, i.total - (i.isInstallment ? i.installments.reduce((a, ins) => a + (ins.paid ? ins.amount : 0), 0) : i.status === 'paid' ? i.total : 0)), 0);
    const totalLoyalty = (customers || []).reduce((s, c) => s + (c.loyaltyPoints || 0), 0);
    const totalExpenses = (appData.manualExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);

    // ماژول‌های جدید (دفتر باشگاه)
    const { bookings, tickets, spaces, tenants, leases, staff, classSessions, attendances } = appData;
    const todayStr = new Date().toISOString().split('T')[0];
    const rentalMonth = rentalIncomeMonth(appData);
    const payrollMonthVal = payrollMonth(appData);
    const bookingsToday = (bookings || []).filter((b) => b.date === todayStr && b.status === 'booked').length;
    const attendanceToday = (attendances || []).filter((a) => a.date === todayStr).length;
    const openTickets = (tickets || []).filter((t) => t.status === 'open' || t.status === 'pending').length;
    const activeLeases = (leases || []).filter((l) => l.status === 'active').length;
    const activeStaff = (staff || []).filter((s) => s.status === 'active').length;
    const trainers = (staff || []).filter((s) => s.role === 'trainer' && s.status === 'active');
    const buffetLeased = isBuffetLeased(appData);

    // تعیین دامنهٔ نمایش بر اساس نقش فعال (RBAC)
    const fullRoles = ['super_admin', 'owner', 'branch_manager'] as const;
    const buffetRoles = ['buffet_manager', 'buffet_seller'] as const;
    let scope: 'full' | 'accountant' | 'buffet' | 'trainer' | 'reception' | 'hr' | 'it' | 'minimal' = 'minimal';
    if ((fullRoles as readonly string[]).includes(role)) scope = 'full';
    else if (role === 'accountant') scope = 'accountant';
    else if ((buffetRoles as readonly string[]).includes(role)) scope = 'buffet';
    else if (role === 'trainer') scope = 'trainer';
    else if (role === 'reception') scope = 'reception';
    else if (role === 'hr') scope = 'hr';
    else if (role === 'it') scope = 'it';

    if (!isClient) {
        return (
            <div className="flex flex-col h-full">
                <Header breadcrumbs={[]} activeBreadcrumb="داشبورد" />
                <main className="flex-1 p-4 sm:px-6 sm:py-6">
                    <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-5">
                        {[...Array(5)].map((_, i) => (
                            <Card key={i}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-4 w-4" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-8 w-32 mb-2" />
                                    <Skeleton className="h-4 w-20" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    // --- دیدِ دفتر بر اساس نقش (دو دفتر هرگز ترکیب نمی‌شوند) ---
    const books = viewableBooks(role);
    const canGym = books.includes('gym');
    const canBuffet = books.includes('buffet');

    // --- زیربخش‌های قابل استفادهٔ مشترک ---
    const twoBooksCards = (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            {canBuffet && (
            <Card className="border-blue-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">درآمد بوفه</CardTitle>
                    <Store className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{(metrics.totalRevenue ?? 0).toLocaleString('fa-IR')} تومان</p>
                    <p className="text-xs text-muted-foreground">{(metrics.totalSales ?? 0).toLocaleString('fa-IR')} فروش</p>
                </CardContent>
            </Card>
            )}
            {canBuffet && (
            <Card className="border-blue-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">سود ناخالص بوفه</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-green-600">{(metrics.grossProfit ?? 0).toLocaleString('fa-IR')} تومان</p>
                    <p className="text-xs text-muted-foreground">درآمد منهای بهای کالا</p>
                </CardContent>
            </Card>
            )}
            {canGym && (
            <Card className="border-emerald-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">وصولی شهریه (ماه)</CardTitle>
                    <Dumbbell className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{(metrics.membershipRevenueMonth ?? 0).toLocaleString('fa-IR')} تومان</p>
                    <p className="text-xs text-muted-foreground">حساب باشگاه (مجزا)</p>
                </CardContent>
            </Card>
            )}
            {canGym && (
            <Card className="border-emerald-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">بدهی سررسید‌گذشته</CardTitle>
                    <CreditCard className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-amber-600">{gymOverdueAmount.toLocaleString('fa-IR')} تومان</p>
                    <p className="text-xs text-muted-foreground">{gymOverdue.length} فاکتور</p>
                </CardContent>
            </Card>
            )}
        </div>
    );

    const gymModuleCards = (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            <StatCard title="اجاره‌بهای ماه (وصولی)" value={`${(rentalMonth || 0).toLocaleString('fa-IR')} تومان`} icon={Building2} description={`${activeLeases} قرارداد فعال · ${spaces?.length || 0} فضا`} />
            <StatCard title="حقوق پرداختی ماه" value={`${(payrollMonthVal || 0).toLocaleString('fa-IR')} تومان`} icon={Wallet} description={`${activeStaff} کارمند فعال`} />
            <StatCard title="رزروهای امروز" value={`${(bookingsToday || 0).toLocaleString('fa-IR')}`} icon={CalendarDays} description="جلسات رزرو شده" />
            <StatCard title="حضور و غیاب امروز" value={`${(attendanceToday || 0).toLocaleString('fa-IR')}`} icon={Users} description="ورود ثبت‌شده" />
            <StatCard title="تیکت‌های باز" value={`${(openTickets || 0).toLocaleString('fa-IR')}`} icon={LifeBuoy} description="پشتیبانی / Help Desk" />
        </div>
    );

    const alertsCard = (
        <div className="grid gap-4 md:grid-cols-2 mb-4">
            {canBuffet && (
            <Card className={lowStock.length ? 'border-amber-500' : ''}>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-500" /> هشدار موجودی کم مواد اولیه</CardTitle>
                </CardHeader>
                <CardContent className="text-sm max-h-44 overflow-y-auto">
                    {lowStock.length === 0 ? (
                        <p className="text-muted-foreground">همه موجودی‌ها بالاتر از آستانه ({threshold}) هستند.</p>
                    ) : (
                        <ul className="space-y-1">
                            {lowStock.slice(0, 12).map((i, idx) => (
                                <li key={idx} className="flex justify-between">
                                    <span>{i.kind}: {i.name}</span>
                                    <Badge variant={i.stock <= 0 ? 'destructive' : 'secondary'}>{i.stock}</Badge>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
            )}
            <Card className={(expiring.length || upcomingBirthdays.length) ? 'border-primary/40' : ''}>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm"><CalendarClock className="h-4 w-4 text-primary" /> یادآوری‌ها</CardTitle>
                </CardHeader>
                <CardContent className="text-sm max-h-44 overflow-y-auto space-y-1">
                    {expiring.length === 0 && upcomingBirthdays.length === 0 && (
                        <p className="text-muted-foreground">موردی برای یادآوری نیست.</p>
                    )}
                    {expiring.map((m) => {
                        const c = customers.find((x) => x.id === m.customerId);
                        return <p key={m.id}>⏰ عضویت {c?.name || 'مشتری'} تا {daysUntil(m.endDate)} روز دیگر به پایان می‌رسد.</p>;
                    })}
                    {upcomingBirthdays.map((b) => (
                        <p key={b.id}>🎂 تولد {b.name} {b.inDays === 0 ? 'امروز' : `تا ${b.inDays} روز دیگر`}</p>
                    ))}
                </CardContent>
            </Card>
        </div>
    );

    const chartsBlock = (
        <>
            <div className="mt-4 grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader><CardTitle>نمای کلی فروش بوفه</CardTitle></CardHeader>
                    <CardContent className="pl-2"><OverviewChart /></CardContent>
                </Card>
                <BestSellers />
            </div>
            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>فروش‌های اخیر بوفه</CardTitle>
                        <CardDescription>آخرین سفارشات ثبت شده در سیستم.</CardDescription>
                    </CardHeader>
                    <CardContent><RecentSales /></CardContent>
                </Card>
            </div>
        </>
    );

    // --- بدنه بر اساس نقش ---
    let body: React.ReactNode = null;

    if (scope === 'full') {
        body = (
            <>
                {twoBooksCards}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    {canBuffet && <StatCard title="سود خالص" value={`${(metrics.netProfit ?? 0).toLocaleString('fa-IR')} تومان`} icon={TrendingUp} description="سود ناخالص منهای هزینه و ضایعات" />}
                    {canBuffet && <StatCard title="ارزش موجودی" value={`${(metrics.inventoryValue ?? 0).toLocaleString('fa-IR')} تومان`} icon={Package} description="ارزش کل محصولات و مواد اولیه" />}
                    {canGym && <StatCard title="کل صادر شده شهریه" value={`${gymIssued.toLocaleString('fa-IR')} تومان`} icon={CreditCard} description="فاکتورهای باشگاه" />}
                    {canBuffet && <StatCard title="امتیاز وفاداری" value={`${(totalLoyalty || 0).toLocaleString('fa-IR')}`} icon={Gift} description="مجموع امتیاز مشتریان بوفه" />}
                </div>
                {gymModuleCards}
                {alertsCard}
                {canBuffet && chartsBlock}
            </>
        );
    } else if (scope === 'accountant') {
        body = (
            <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    <Card className="border-emerald-500/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">وصولی شهریه (ماه)</CardTitle>
                            <Dumbbell className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent><p className="text-2xl font-bold">{(metrics.membershipRevenueMonth ?? 0).toLocaleString('fa-IR')} تومان</p></CardContent>
                    </Card>
                    <Card className="border-emerald-500/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">بدهی سررسید‌گذشته</CardTitle>
                            <CreditCard className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent><p className="text-2xl font-bold text-amber-600">{gymOverdueAmount.toLocaleString('fa-IR')} تومان</p><p className="text-xs text-muted-foreground">{gymOverdue.length} فاکتور</p></CardContent>
                    </Card>
                    <Card className="border-emerald-500/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">حقوق پرداختی (ماه)</CardTitle>
                            <Wallet className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent><p className="text-2xl font-bold">{(payrollMonthVal || 0).toLocaleString('fa-IR')} تومان</p></CardContent>
                    </Card>
                    <Card className="border-emerald-500/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">اجاره‌بهای وصولی (ماه)</CardTitle>
                            <Building2 className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent><p className="text-2xl font-bold">{(rentalMonth || 0).toLocaleString('fa-IR')} تومان</p></CardContent>
                    </Card>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
                    <StatCard title="کل صادر شده شهریه" value={`${gymIssued.toLocaleString('fa-IR')} تومان`} icon={Receipt} description="فاکتورهای باشگاه" />
                    <StatCard title="مجموع هزینه‌ها" value={`${(totalExpenses || 0).toLocaleString('fa-IR')} تومان`} icon={Scale} description="هزینه‌های ثبت‌شده (دفتر باشگاه)" />
                    <StatCard title="رزروهای امروز" value={`${(bookingsToday || 0).toLocaleString('fa-IR')}`} icon={CalendarDays} description="جلسات رزرو شده" />
                </div>
                {alertsCard}
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <Link href="/ledgers" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> دفتر دوگانه (بوفه / باشگاه)</CardContent></Card></Link>
                    <Link href="/expenses" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> مدیریت هزینه‌ها</CardContent></Card></Link>
                    <Link href="/reports" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> گزارشات مالی</CardContent></Card></Link>
                </div>
            </>
        );
    } else if (scope === 'buffet') {
        body = (
            <>
                {buffetLeased && (
                    <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-800">
                        بوفه در حال حاضر به مستأجر اجاره داده شده است؛ درآمد عملیاتی آن متعلق به مستأجر است و در تراز باشگاه لحاظ نمی‌شود.
                    </div>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    <Card className="border-blue-500/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">درآمد بوفه</CardTitle>
                            <Store className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent><p className="text-2xl font-bold">{(metrics.totalRevenue ?? 0).toLocaleString('fa-IR')} تومان</p><p className="text-xs text-muted-foreground">{(metrics.totalSales ?? 0).toLocaleString('fa-IR')} فروش</p></CardContent>
                    </Card>
                    <Card className="border-blue-500/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">سود ناخالص بوفه</CardTitle>
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent><p className="text-2xl font-bold text-green-600">{(metrics.grossProfit ?? 0).toLocaleString('fa-IR')} تومان</p></CardContent>
                    </Card>
                    <Card className="border-blue-500/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">ارزش موجودی</CardTitle>
                            <Package className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent><p className="text-2xl font-bold">{(metrics.inventoryValue ?? 0).toLocaleString('fa-IR')} تومان</p></CardContent>
                    </Card>
                    <Card className={lowStock.length ? 'border-amber-500' : ''}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">موجودی کم</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent><p className="text-2xl font-bold">{lowStock.length}</p><p className="text-xs text-muted-foreground">مورد زیر آستانه</p></CardContent>
                    </Card>
                </div>
                {chartsBlock}
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <Link href="/pos" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><Store className="h-5 w-5 text-primary" /> فروشگاه (POS)</CardContent></Card></Link>
                    <Link href="/cashier" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> صندوق‌داری</CardContent></Card></Link>
                    <Link href="/reports" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> گزارشات</CardContent></Card></Link>
                </div>
            </>
        );
    } else if (scope === 'trainer') {
        body = (
            <>
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <StatCard title="رزروهای امروز" value={`${(bookingsToday || 0).toLocaleString('fa-IR')}`} icon={CalendarDays} description="جلسات رزرو شده" />
                    <StatCard title="کلاس‌های تعریف‌شده" value={`${(classSessions || []).length}`} icon={ClipboardList} description="برنامه هفتگی" />
                    <StatCard title="مربیان فعال" value={`${(trainers || []).length}`} icon={Users} description="تیم مربیگری" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> برنامه کلاس‌ها و رزروها</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-sm text-muted-foreground">مدیریت رزروهای اعضا و کلاس‌های هفتگی خود را از اینجا انجام دهید.</p>
                            <Link href="/booking"><Button size="sm">مشاهده رزرو و کلاس‌ها</Button></Link>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> پروفایل عمومی شما</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-sm text-muted-foreground">نمای عمومی شما برای مشتریان (رزومه، شهریه خصوصی، فعالیت).</p>
                            <Link href="/trainers"><Button size="sm" variant="outline">مشاهده فهرست مربیان</Button></Link>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    } else if (scope === 'reception') {
        body = (
            <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    <StatCard title="عضویت‌های رو به انقضا" value={`${(expiring || []).length}`} icon={CalendarClock} description="تا ۷ روز آینده" />
                    <StatCard title="رزروهای امروز" value={`${(bookingsToday || 0).toLocaleString('fa-IR')}`} icon={CalendarDays} description="جلسات رزرو شده" />
                    <StatCard title="حضور و غیاب امروز" value={`${(attendanceToday || 0).toLocaleString('fa-IR')}`} icon={Users} description="ورود ثبت‌شده" />
                    <StatCard title="تیکت‌های باز" value={`${(openTickets || 0).toLocaleString('fa-IR')}`} icon={LifeBuoy} description="پشتیبانی" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <Card>
                        <CardHeader><CardTitle className="text-sm">عضویت‌های رو به انقضا</CardTitle></CardHeader>
                        <CardContent className="text-sm max-h-44 overflow-y-auto space-y-1">
                            {expiring.length === 0 ? <p className="text-muted-foreground">موردی نیست.</p> :
                                expiring.map((m) => {
                                    const c = customers.find((x) => x.id === m.customerId);
                                    return <p key={m.id}>⏰ {c?.name || 'مشتری'} — {daysUntil(m.endDate)} روز دیگر</p>;
                                })}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-sm">دسترسی سریع</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            <Link href="/memberships"><Button size="sm">ثبت عضویت</Button></Link>
                            <Link href="/booking"><Button size="sm" variant="outline">ثبت رزرو</Button></Link>
                            <Link href="/customers"><Button size="sm" variant="outline">مشتریان</Button></Link>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    } else if (scope === 'hr') {
        body = (
            <>
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <StatCard title="کارکنان فعال" value={`${(activeStaff || 0)}`} icon={Users} description="همه نقش‌ها" />
                    <StatCard title="مربیان فعال" value={`${(trainers || []).length}`} icon={ClipboardList} description="تیم مربیگری" />
                    <StatCard title="حقوق پرداختی (ماه)" value={`${(payrollMonthVal || 0).toLocaleString('fa-IR')} تومان`} icon={Wallet} description="مجموع حقوق" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <Link href="/hrm" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> منابع انسانی و حقوق</CardContent></Card></Link>
                    <Link href="/trainers" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> مدیریت مربیان</CardContent></Card></Link>
                </div>
            </>
        );
    } else if (scope === 'it') {
        body = (
            <div className="grid gap-4 md:grid-cols-3 mb-4">
                <Link href="/settings" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /> تنظیمات سیستم</CardContent></Card></Link>
                <Link href="/audit" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> لاگ فعالیت</CardContent></Card></Link>
                <Link href="/reports" className="block"><Card className="hover:border-primary transition-colors"><CardContent className="p-4 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> گزارشات</CardContent></Card></Link>
            </div>
        );
    } else {
        // member / technician / cleaner — حداقل
        const isMember = role === 'member';
        body = (
            <Card className="mb-4">
                <CardContent className="p-6 space-y-3">
                    <p className="text-lg font-semibold">داشبورد {roleLabel(role)}</p>
                    <p className="text-sm text-muted-foreground">
                        {isMember
                            ? 'شما از طریق پورتال مشتری به حساب خود دسترسی دارید.'
                            : 'ماژول تخصصی این نقش (تعمیرات / نظافت) در حال توسعه است. در حال حاضر امکان مشاهدهٔ تیکت‌های پشتیبانی را دارید.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {isMember ? (
                            <Link href="/customer/login"><Button size="sm">ورود به پورتال مشتری</Button></Link>
                        ) : (
                            <Link href="/help-desk"><Button size="sm">مشاهده تیکت‌های پشتیبانی</Button></Link>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <Header breadcrumbs={[]} activeBreadcrumb="داشبورد" />
            <main className="flex-1 p-4 sm:px-6 sm:py-6">
                {!account?.setupComplete && (
                    <Card className="mb-4 border-primary/40 bg-primary/5">
                        <CardContent className="flex items-center justify-between gap-4 py-4">
                            <div className="flex items-center gap-3">
                                <Rocket className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="font-semibold">راه‌اندازی اولیه انجام نشده است</p>
                                    <p className="text-sm text-muted-foreground">نام مجموعه، صاحبان بوفه و باشگاه و درگاه پرداخت را تنظیم کنید.</p>
                                </div>
                            </div>
                            <Button onClick={() => setSetupOpen(true)}>شروع راه‌اندازی</Button>
                        </CardContent>
                    </Card>
                )}

                <div className="mb-4 flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-sm py-1">داشبورد تخصصی: {roleLabel(role)}</Badge>
                    <span className="text-xs text-muted-foreground">نقش را از سوئیچر کنار منو تغییر دهید تا دسترسی‌ها و کارت‌ها به‌روزرسانی شوند.</span>
                </div>

                {body}
            </main>
            <SetupWizard open={setupOpen} onOpenChange={setSetupOpen} />
        </div>
    );
}
