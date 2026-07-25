
import { useSyncExternalStore } from 'react';
import type { AppData, Product, Ingredient, Food, Customer, CustomerTransaction, Order, Purchase, Expense, Waste, Account, MembershipPlan, Membership, MembershipInvoice, Installment, AuditEntry, Space, Tenant, Lease, RentInvoice, Staff, PayrollRecord, ClassSession, Booking, Ticket, Attendance, UserAccount, TrainerApplication, Program, ChatMessage } from './types';
import { 
    products as initialProducts, 
    ingredients as initialIngredients, 
    foods as initialFoods, 
    customers as initialCustomers, 
    customerTransactions as initialCustomerTransactions,
    recentOrders as initialOrders, 
    purchases as initialPurchases, 
    expenses as initialExpenses 
} from './data';

const STORE_VERSION = '1.5'; // Version with Account object
const VERSION_KEY = 'gym-canteen-version';
const DATA_KEY = 'gym-canteen-app-data';

const INITIAL_DATA: AppData = {
  products: initialProducts,
  ingredients: initialIngredients,
  foods: initialFoods,
  customers: initialCustomers,
  customerTransactions: initialCustomerTransactions,
  orders: initialOrders,
  purchases: initialPurchases,
  manualExpenses: initialExpenses,
  waste: [],
  membershipPlans: [],
  memberships: [],
  membershipInvoices: [],
  auditLog: [],
  spaces: [],
  tenants: [],
  leases: [],
  rentInvoices: [],
  staff: [],
  payrolls: [],
  classSessions: [],
  bookings: [],
  tickets: [],
  attendances: [],
  users: [],
  trainerApplications: [],
  programs: [],
  chatMessages: [],
  account: {
    businessName: 'بوفه باشگاه',
    managerName: 'مدیر سیستم',
    email: 'yashartavakolnia@gmail.com',
    phone: '09367008618',
    locale: 'fa-IR',
    currency: 'TOMAN',
    calendar: 'jalali',
    lowStockThreshold: 10,
    paymentGateway: 'mock',
    requireManagementAuth: false,
    setupComplete: false,
    enableNotifications: false,
    buffet: { ownerName: '', businessName: 'بوفه باشگاه' },
    gym: { ownerName: '', businessName: 'باشگاه' },
  }
};

// --- Data Normalization ---
// This function ensures that data loaded from localStorage is valid and complete.
function normalizeData(data: any): AppData {
    const normalized: AppData = { ...INITIAL_DATA };

    if (!data || typeof data !== 'object') {
        return normalized;
    }
    
    normalized.products = (data.products || []).map((p: Partial<Product>): Product => ({
        id: p.id || `prod-${Date.now()}`,
        name: p.name || 'محصول بی نام',
        stock: p.stock || 0,
        avgBuyPrice: p.avgBuyPrice || 0,
        sellPrice: p.sellPrice || 0,
        imageId: p.imageId || 'water_bottle',
        status: p.status || 'active',
        category: p.category || 'سایر',
        barcode: p.barcode,
    })).filter((p: Product | null) => p);

    normalized.ingredients = (data.ingredients || []).map((i: Partial<Ingredient>): Ingredient => ({
        id: i.id || `ing-${Date.now()}`,
        name: i.name || 'ماده اولیه بی نام',
        stock: i.stock || 0,
        avgBuyPrice: i.avgBuyPrice || 0,
        unit: i.unit || 'g',
        status: i.status || 'active',
    })).filter((i: Ingredient | null) => i);
    
    normalized.foods = (data.foods || []).map((f: Partial<Food>): Food => ({
        id: f.id || `food-${Date.now()}`,
        name: f.name || 'غذای بی نام',
        recipe: f.recipe || [],
        sellPrice: f.sellPrice || 0,
        imageId: f.imageId || 'avocado_toast',
        imageDataUrl: f.imageDataUrl || null,
        status: f.status || 'active',
    })).filter((f: Food | null) => f);

    normalized.customers = (data.customers || []).map((c: Partial<Customer>): Customer => ({
        id: c.id || `cust-${Date.now()}`,
        name: c.name || 'مشتری بی نام',
        status: c.status || 'active',
        email: c.email,
        phone: c.phone,
        nationalId: c.nationalId,
        lastName: c.lastName,
        trainerId: c.trainerId,
        loyaltyPoints: c.loyaltyPoints || 0,
        birthDate: c.birthDate,
    })).filter((c: Customer | null) => c);

    normalized.customerTransactions = (data.customerTransactions || []).filter((ct: CustomerTransaction | null) => ct);
    
    normalized.orders = (data.orders || []).map((o: Partial<Order>): Order => ({
      id: o.id || `order-${Date.now()}`,
      items: o.items || [],
      total: o.total || 0,
      totalCost: o.totalCost || 0, // Add default for new field
      customerName: o.customerName || 'مشتری نامشخص',
      customerId: o.customerId || '',
      createdAt: o.createdAt || new Date().toISOString(),
      status: o.status || 'پرداخت شده'
    })).filter((o: Order | null) => o);
    
    normalized.purchases = (data.purchases || []).map((p: Partial<Purchase>): Purchase => ({
        id: p.id || `pur-${Date.now()}`,
        date: p.date || new Date().toISOString(),
        items: p.items || [],
        transportCost: p.transportCost || 0,
        note: p.note || '',
        status: p.status || 'active',
    })).filter((p: Purchase | null) => p);

    normalized.manualExpenses = (data.manualExpenses || []).map((e: Partial<Expense>): Expense => ({
        id: e.id || `exp-${Date.now()}`,
        description: e.description || 'هزینه',
        amount: e.amount || 0,
        date: e.date || new Date().toISOString(),
        scope: e.scope || 'shared',
    })).filter((e: Expense | null) => e);

    normalized.auditLog = (data.auditLog || []).filter((a: AuditEntry | null) => a && a.action);
    
    normalized.waste = (data.waste || []).map((w: Partial<Waste>): Waste => ({
        id: w.id || `waste-${Date.now()}`,
        date: w.date || new Date().toISOString(),
        itemType: w.itemType || 'product',
        itemId: w.itemId || '',
        itemName: w.itemName || 'کالای نامشخص',
        quantity: w.quantity || 0,
        unit: w.unit || 'عدد',
        cost: w.cost || 0,
        reason: w.reason || '',
    })).filter((w: Waste | null) => w && w.itemId && w.quantity > 0);

    normalized.membershipPlans = (data.membershipPlans || []).map((p: Partial<MembershipPlan>): MembershipPlan => ({
        id: p.id || `plan-${Date.now()}`,
        name: p.name || 'پلن بدون نام',
        category: p.category || 'regular',
        period: p.period || 'monthly',
        price: p.price || 0,
        description: p.description || '',
        status: p.status || 'active',
    })).filter((p: MembershipPlan | null) => p);

    normalized.memberships = (data.memberships || []).map((m: Partial<Membership>): Membership => ({
        id: m.id || `mem-${Date.now()}`,
        customerId: m.customerId || '',
        planId: m.planId || '',
        startDate: m.startDate || new Date().toISOString(),
        endDate: m.endDate || new Date().toISOString(),
        status: m.status || 'active',
        note: m.note || '',
    })).filter((m: Membership | null) => m && m.customerId);

    normalized.membershipInvoices = (data.membershipInvoices || []).map((inv: Partial<MembershipInvoice>): MembershipInvoice => ({
        id: inv.id || `inv-${Date.now()}`,
        customerId: inv.customerId || '',
        membershipId: inv.membershipId,
        planId: inv.planId,
        title: inv.title || 'فاکتور شهریه',
        issueDate: inv.issueDate || new Date().toISOString(),
        total: inv.total || 0,
        isInstallment: inv.isInstallment || false,
        installments: (inv.installments || []).map((ins: Partial<Installment>): Installment => ({
            id: ins.id || `inst-${Date.now()}`,
            dueDate: ins.dueDate || new Date().toISOString(),
            amount: ins.amount || 0,
            paid: ins.paid || false,
            paidDate: ins.paidDate,
            note: ins.note || '',
        })),
        status: inv.status || 'unpaid',
        note: inv.note || '',
    })).filter((inv: MembershipInvoice | null) => inv && inv.customerId);

    normalized.spaces = (data.spaces || []).map((s: Partial<Space>): Space => ({
        id: s.id || `space-${Date.now()}`,
        name: s.name || 'فضای بی نام',
        type: s.type || 'other',
        area: s.area,
        description: s.description,
        status: s.status || 'active',
    })).filter((s: Space | null) => s);

    normalized.tenants = (data.tenants || []).map((t: Partial<Tenant>): Tenant => ({
        id: t.id || `tenant-${Date.now()}`,
        name: t.name || 'مستأجر بی نام',
        contact: t.contact,
        phone: t.phone,
        email: t.email,
        note: t.note,
        status: t.status || 'active',
    })).filter((t: Tenant | null) => t);

    normalized.leases = (data.leases || []).map((l: Partial<Lease>): Lease => ({
        id: l.id || `lease-${Date.now()}`,
        tenantId: l.tenantId || '',
        spaceId: l.spaceId || '',
        startDate: l.startDate || new Date().toISOString(),
        endDate: l.endDate || new Date().toISOString(),
        monthlyRent: l.monthlyRent || 0,
        deposit: l.deposit,
        billingDay: l.billingDay || 1,
        escalationPct: l.escalationPct,
        note: l.note,
        status: l.status || 'active',
    })).filter((l: Lease | null) => l && l.tenantId && l.spaceId);

    normalized.rentInvoices = (data.rentInvoices || []).map((r: Partial<RentInvoice>): RentInvoice => ({
        id: r.id || `rinv-${Date.now()}`,
        leaseId: r.leaseId || '',
        tenantId: r.tenantId || '',
        spaceId: r.spaceId || '',
        periodLabel: r.periodLabel || '',
        dueDate: r.dueDate || new Date().toISOString(),
        amount: r.amount || 0,
        status: r.status || 'unpaid',
        paidDate: r.paidDate,
    })).filter((r: RentInvoice | null) => r);

    normalized.staff = (data.staff || []).map((s: Partial<Staff>): Staff => ({
        id: s.id || `staff-${Date.now()}`,
        name: s.name || 'کارمند بی نام',
        role: s.role || 'other',
        employmentType: s.employmentType || 'fulltime',
        phone: s.phone,
        nationalId: s.nationalId,
        monthlySalary: s.monthlySalary || 0,
        hireDate: s.hireDate || new Date().toISOString(),
        status: s.status || 'active',
        note: s.note,
        branch: s.branch,
        privateRate: s.privateRate,
        bio: s.bio,
        specialties: Array.isArray(s.specialties) ? s.specialties : (typeof s.specialties === 'string' && (s.specialties as string).length ? (s.specialties as string).split(',').map((x: string) => x.trim()).filter(Boolean) : []),
    })).filter((s: Staff | null) => s);

    normalized.payrolls = (data.payrolls || []).map((p: Partial<PayrollRecord>): PayrollRecord => ({
        id: p.id || `pay-${Date.now()}`,
        staffId: p.staffId || '',
        staffName: p.staffName || '',
        periodLabel: p.periodLabel || '',
        amount: p.amount || 0,
        issueDate: p.issueDate || new Date().toISOString(),
        status: p.status || 'unpaid',
        paidDate: p.paidDate,
    })).filter((p: PayrollRecord | null) => p);

    normalized.classSessions = (data.classSessions || []).map((c: Partial<ClassSession>): ClassSession => ({
        id: c.id || `cls-${Date.now()}`,
        title: c.title || 'کلاس بی نام',
        trainerId: c.trainerId,
        trainerName: c.trainerName,
        dayOfWeek: c.dayOfWeek ?? 0,
        startTime: c.startTime || '08:00',
        durationMin: c.durationMin || 60,
        capacity: c.capacity || 1,
        note: c.note,
    })).filter((c: ClassSession | null) => c);

    normalized.bookings = (data.bookings || []).map((b: Partial<Booking>): Booking => ({
        id: b.id || `bk-${Date.now()}`,
        memberId: b.memberId,
        memberName: b.memberName || 'مشتری',
        sessionId: b.sessionId,
        title: b.title || 'جلسه',
        trainerId: b.trainerId,
        trainerName: b.trainerName,
        date: b.date || new Date().toISOString().split('T')[0],
        startTime: b.startTime || '08:00',
        durationMin: b.durationMin || 60,
        fee: b.fee,
        paid: b.paid,
        status: b.status || 'booked',
        note: b.note,
    })).filter((b: Booking | null) => b);

    normalized.tickets = (data.tickets || []).map((t: Partial<Ticket>): Ticket => ({
        id: t.id || `tk-${Date.now()}`,
        subject: t.subject || 'بدون موضوع',
        contactName: t.contactName,
        contactPhone: t.contactPhone,
        contactEmail: t.contactEmail,
        channel: t.channel || 'walkin',
        priority: t.priority || 'normal',
        status: t.status || 'open',
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt || new Date().toISOString(),
        assignedTo: t.assignedTo,
        scope: t.scope,
        messages: (t.messages || []).filter((m: TicketMessage | null) => m && m.text).map((m: Partial<TicketMessage>): TicketMessage => ({
            id: m.id || `msg-${Date.now()}`,
            at: m.at || new Date().toISOString(),
            from: m.from || 'customer',
            text: m.text || '',
        })),
        tags: t.tags || [],
    })).filter((t: Ticket | null) => t);

    normalized.attendances = (data.attendances || []).map((a: Partial<Attendance>): Attendance => ({
        id: a.id || `att-${Date.now()}`,
        kind: a.kind || 'member',
        personId: a.personId,
        personName: a.personName || 'نامشخص',
        role: a.role,
        date: a.date || new Date().toISOString().split('T')[0],
        timeIn: a.timeIn || '08:00',
        timeOut: a.timeOut,
        method: a.method || 'manual',
        note: a.note,
    })).filter((a: Attendance | null) => a);

    normalized.users = (data.users || []).map((u: Partial<UserAccount>): UserAccount => ({
        id: u.id || `user-${Date.now()}`,
        username: u.username || '',
        name: u.name || '',
        role: u.role || 'reception',
        passwordHash: u.passwordHash,
        staffId: u.staffId,
        active: u.active !== false,
        createdAt: u.createdAt || new Date().toISOString(),
    })).filter((u: UserAccount | null) => u && u.username);

    normalized.trainerApplications = (data.trainerApplications || []).map((a: Partial<TrainerApplication>): TrainerApplication => ({
        id: a.id || `app-${Date.now()}`,
        name: a.name || 'نامشخص',
        phone: a.phone,
        email: a.email,
        resume: a.resume,
        portfolio: a.portfolio,
        experience: a.experience,
        status: a.status || 'pending',
        note: a.note,
        createdAt: a.createdAt || new Date().toISOString(),
        reviewedAt: a.reviewedAt,
    })).filter((a: TrainerApplication | null) => a);

    normalized.programs = (data.programs || []).map((p: Partial<Program>): Program => ({
        id: p.id || `prog-${Date.now()}`,
        type: p.type || 'workout',
        memberId: p.memberId || '',
        memberName: p.memberName || '',
        trainerId: p.trainerId,
        trainerName: p.trainerName,
        title: p.title || 'برنامه',
        details: p.details || '',
        createdAt: p.createdAt || new Date().toISOString(),
    })).filter((p: Program | null) => p && p.memberId);

    normalized.chatMessages = (data.chatMessages || []).map((m: Partial<ChatMessage>): ChatMessage => ({
        id: m.id || `msg-${Date.now()}`,
        trainerId: m.trainerId || '',
        trainerName: m.trainerName || '',
        memberId: m.memberId || '',
        memberName: m.memberName || '',
        from: m.from || 'member',
        text: m.text || '',
        at: m.at || new Date().toISOString(),
    })).filter((m: ChatMessage | null) => m && m.memberId && m.trainerId);

    normalized.account = {
      ...INITIAL_DATA.account,
      ...(data.account || {}),
    };


    return normalized;
}


// --- Core Store Logic ---

let appData: AppData = { ...INITIAL_DATA };
let listeners: (() => void)[] = [];

function loadData(): AppData {
  if (typeof window === 'undefined') {
    return { ...INITIAL_DATA };
  }
  
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const rawData = localStorage.getItem(DATA_KEY);

    if (storedVersion !== STORE_VERSION || !rawData) {
      console.log(`Store version mismatch or no data. Initializing store. Old: ${storedVersion}, New: ${STORE_VERSION}`);
      const normalizedInitialData = normalizeData(INITIAL_DATA);
      localStorage.setItem(VERSION_KEY, STORE_VERSION);
      localStorage.setItem(DATA_KEY, JSON.stringify(normalizedInitialData));
      
      return normalizedInitialData;
    }

    const loadedData = JSON.parse(rawData);
    // On every load, normalize the data to handle migrations and ensure data integrity.
    return normalizeData(loadedData);

  } catch (error) {
    console.error("Failed to load or parse data from localStorage, falling back to initial data.", error);
    // If anything goes wrong, reset to a known good state
    localStorage.setItem(VERSION_KEY, STORE_VERSION);
    localStorage.setItem(DATA_KEY, JSON.stringify(INITIAL_DATA));
    return { ...INITIAL_DATA };
  }
}

function saveData(dataUpdate: Partial<AppData> | ((currentData: AppData) => AppData)) {
  if (typeof window === 'undefined') return;
  
  try {
    const currentData = loadData();
    const newData = typeof dataUpdate === 'function' ? dataUpdate(currentData) : { ...currentData, ...dataUpdate };

    if (!newData || typeof newData !== 'object' || !newData.products) {
        console.error("Attempted to save invalid data. Aborting.", newData);
        return;
    }

    localStorage.setItem(DATA_KEY, JSON.stringify(newData));
    notify();
  } catch (error) {
    console.error("Failed to save data to localStorage", error);
  }
}

function emit() {
  for (let listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function getSnapshot(): AppData {
  return appData;
}

function notify() {
  appData = loadData();
  emit();
}

// Initial load
if (typeof window !== 'undefined') {
  appData = loadData();
  window.addEventListener('storage', (event) => {
    if (event.key === DATA_KEY) {
      notify();
    }
  });
}

export const dataStore = {
  subscribe,
  getSnapshot,
  saveData,
  resetData: () => {
    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(VERSION_KEY);
    notify();
  },
  importData: (importedData: AppData) => {
     try {
        const normalized = normalizeData(importedData);
        localStorage.setItem(DATA_KEY, JSON.stringify(normalized));
        localStorage.setItem(VERSION_KEY, STORE_VERSION);
        notify();
        return true;
     } catch (e) {
        console.error("Failed to import data", e);
        return false;
     }
  }
};

export function useAppData(): AppData {
  return useSyncExternalStore(dataStore.subscribe, dataStore.getSnapshot, () => INITIAL_DATA);
}
