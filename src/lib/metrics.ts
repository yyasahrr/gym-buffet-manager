import type { AppData, Space, Tenant, Lease } from './types';

// ----------------------- Two-Ledger Accounting (دفتر دوگانه) -----------------------
// به‌طور پیش‌فرض بوفه و باشگاه دو دفتر مجزا دارند. استثنای مهم: اگر فضای «بوفه» به
// مستأجر ثالث اجاره داده شود، درآمد عملیاتی آن بوفه متعلق به مستأجر است نه باشگاه؛
// یعنی نباید در تراز باشگاه لحاظ شود.

export interface LeasedBuffet {
  space: Space;
  tenant: Tenant;
  lease: Lease;
}

// فضاهای بوفه‌ای که در حال حاضر به مستأجر اجاره داده شده‌اند
export function getLeasedBuffets(data: AppData): LeasedBuffet[] {
  const activeLeases = (data.leases || []).filter((l) => l.status === 'active' && l.tenantId && l.spaceId);
  const result: LeasedBuffet[] = [];
  for (const lease of activeLeases) {
    const space = (data.spaces || []).find((s) => s.id === lease.spaceId);
    if (space && space.type === 'buffet') {
      const tenant = (data.tenants || []).find((t) => t.id === lease.tenantId);
      if (tenant) result.push({ space, tenant, lease });
    }
  }
  return result;
}

export function isBuffetLeased(data: AppData): boolean {
  return getLeasedBuffets(data).length > 0;
}
export interface LedgerLine {
  label: string;
  value: number; // مثبت = درآمد، منفی = هزینه
}

export interface Ledger {
  label: string;       // نام واحد (صاحب)
  owner?: string;      // نام صاحب واحد
  revenue: number;     // جمع درآمدها
  expenses: number;    // جمع هزینه‌ها (مثبت)
  net: number;         // خالص (revenue - expenses)
  lines: LedgerLine[]; // جزئیات
}

export function calculateLedgers(data: AppData, account?: AppData['account']): { buffet: Ledger; gym: Ledger } {
  // --- بوفه ---
  const buffetRevenue = (data.orders || []).reduce((s, o) => s + (o.total || 0), 0);
  const buffetCOGS = (data.orders || []).reduce((s, o) => s + (o.totalCost || 0), 0);
  const buffetPurchaseCost = (data.purchases || []).reduce(
    (s, p) => s + (p.items || []).reduce((a, i) => a + (i.lineTotalCost || 0), 0) + (p.transportCost || 0), 0);
  const buffetManualExpenses = (data.manualExpenses || [])
    .filter((e) => (e.scope || 'shared') === 'buffet')
    .reduce((s, e) => s + e.amount, 0);
  const buffetWaste = (data.waste || []).reduce((s, w) => s + (w.cost || 0), 0);
  const buffetExpenses = buffetCOGS + buffetPurchaseCost + buffetManualExpenses + buffetWaste;
  const buffet: Ledger = {
    label: account?.buffet?.businessName || 'بوفه',
    owner: account?.buffet?.ownerName,
    revenue: buffetRevenue,
    expenses: buffetExpenses,
    net: buffetRevenue - buffetExpenses,
    lines: [
      { label: 'فروش', value: buffetRevenue },
      { label: 'بهای کالای فروش‌رفته (COGS)', value: -buffetCOGS },
      { label: 'خرید مواد اولیه و حمل', value: -buffetPurchaseCost },
      { label: 'هزینه‌های بوفه', value: -buffetManualExpenses },
      { label: 'ضایعات', value: -buffetWaste },
    ],
  };

  // --- باشگاه ---
  const membershipRevenue = (data.membershipInvoices || []).reduce((s, inv) => {
    if (!inv.isInstallment) return s + (inv.status === 'paid' ? inv.total : 0);
    return s + (inv.installments || []).reduce((a, ins) => a + (ins.paid ? ins.amount : 0), 0);
  }, 0);
  const rentalRevenue = (data.rentInvoices || [])
    .filter((r) => r.status === 'paid')
    .reduce((s, r) => s + r.amount, 0);
  const bookingRevenue = (data.bookings || [])
    .filter((b) => b.paid && (b.fee || 0) > 0)
    .reduce((s, b) => s + (b.fee || 0), 0);
  const gymRevenue = membershipRevenue + rentalRevenue + bookingRevenue;
  const gymManualExpenses = (data.manualExpenses || [])
    .filter((e) => (e.scope || 'shared') === 'gym')
    .reduce((s, e) => s + e.amount, 0);
  const payrollExpense = (data.payrolls || [])
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + p.amount, 0);
  const gymExpenses = gymManualExpenses + payrollExpense;
  const gym: Ledger = {
    label: account?.gym?.businessName || 'باشگاه',
    owner: account?.gym?.ownerName,
    revenue: gymRevenue,
    expenses: gymExpenses,
    net: gymRevenue - gymExpenses,
    lines: [
      { label: 'شهریه (وصولی)', value: membershipRevenue },
      { label: 'اجاره‌بهای فضاها (وصولی)', value: rentalRevenue },
      { label: 'رزرو کلاس/جلسه', value: bookingRevenue },
      { label: 'هزینه‌های باشگاه', value: -gymManualExpenses },
      { label: 'حقوق پرداختی', value: -payrollExpense },
    ],
  };

  return { buffet, gym };
}

// درآمد/هزینه پرداخت‌شده در ماه جاری (برای کارت‌های داشبورد)
function sumPaidThisMonth<T extends { paidDate?: string; paid?: boolean; date?: string; dueDate?: string }>(
  items: T[], getAmount: (i: T) => number
): number {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  return items.reduce((s, i) => {
    const d = new Date((i.paidDate || i.date || i.dueDate || '') as string);
    if (isNaN(d.getTime())) return s;
    if (d.getFullYear() === y && d.getMonth() === m) return s + getAmount(i);
    return s;
  }, 0);
}

export function rentalIncomeMonth(data: AppData): number {
  return sumPaidThisMonth(
    (data.rentInvoices || []).filter((r) => r.status === 'paid'),
    (r) => r.amount
  );
}

export function payrollMonth(data: AppData): number {
  return sumPaidThisMonth(
    (data.payrolls || []).filter((p) => p.status === 'paid'),
    (p) => p.amount
  );
}

export interface Metrics {
  totalRevenue: number;
  totalSales: number;
  totalCOGS: number;
  grossProfit: number;
  totalWaste: number;
  totalExpenses: number;
  netProfit: number;
  inventoryValue: number;
  membershipRevenueMonth: number;
}

export function calculateMetrics(data: AppData): Metrics {
  const totalRevenue = data.orders.reduce((sum, order) => sum + order.total, 0);
  const totalSales = data.orders.length;
  
  const totalCOGS = data.orders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
  
  const grossProfit = totalRevenue - totalCOGS;

  const totalWaste = data.waste.reduce((sum, wasteItem) => sum + wasteItem.cost, 0);
  
  const totalExpenses = data.manualExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  const netProfit = grossProfit - totalWaste - totalExpenses;
  
  const inventoryValue = 
      data.products.reduce((sum, p) => sum + (p.stock * p.avgBuyPrice), 0) +
      data.ingredients.reduce((sum, i) => sum + (i.stock * i.avgBuyPrice), 0);

  const now = new Date();
  const membershipRevenueMonth = (data.membershipInvoices || []).reduce((sum, inv) => {
    if (!inv.isInstallment) {
      if (inv.status === 'paid') {
        const d = new Date(inv.issueDate);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return sum + inv.total;
      }
      return sum;
    }
    return sum + inv.installments.reduce((s, ins) => {
      if (ins.paid && ins.paidDate) {
        const d = new Date(ins.paidDate);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return s + ins.amount;
      }
      return s;
    }, 0);
  }, 0);

  return {
    totalRevenue,
    totalSales,
    totalCOGS,
    grossProfit,
    totalWaste,
    totalExpenses,
    netProfit,
    inventoryValue,
    membershipRevenueMonth,
  };
}
