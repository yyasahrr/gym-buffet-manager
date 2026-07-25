
export type Product = {
  id: string;
  name: string;
  stock: number;
  avgBuyPrice: number;
  sellPrice: number;
  imageId: string;
  status: 'active' | 'archived';
  category?: string; // دسته‌بندی محصولات بوفه (مثال: نوشیدنی، میان‌وعده)
  barcode?: string;  // بارکد/شناسه سریع برای POS
};

export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'count';

export const unitLabels: Record<Unit, string> = {
    'g': 'گرم',
    'kg': 'کیلوگرم',
    'ml': 'میلی‌لیتر',
    'l': 'لیتر',
    'count': 'عدد'
};

export type Ingredient = {
  id: string;
  name: string;
  stock: number;
  avgBuyPrice: number; // Price per single unit ('g', 'ml', 'count')
  unit: Unit;
  status: 'active' | 'archived';
};

export type RecipeItem = {
  ingredientId: string;
  quantity: number;
};

export type Food = {
  id:string;
  name: string;
  recipe: RecipeItem[];
  sellPrice: number;
  imageId: string; // For placeholder fallback
  imageDataUrl?: string | null; // For uploaded images
  status: 'active' | 'archived';
};

// This is a simplified version of Product | Food for storage in an Order.
// It avoids circular references when serializing to JSON.
export type OrderItemSanitized = {
  id: string;
  name: string;
  sellPrice: number;
  imageId: string;
}

export type OrderItem = {
  item: Product | Food | OrderItemSanitized; // Use the full object in memory, but sanitized version in storage
  quantity: number;
};

export type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  totalCost: number; // Cost of goods sold for this order
  customerName: string;
  customerId: string;
  createdAt: string;
  status: 'پرداخت شده' | 'در انتظار پرداخت';
};

export type Customer = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  email?: string;   // برای ارسال لینک پرداخت
  phone?: string;   // برای ارسال پیامک پرداخت
  nationalId?: string; // کد ملی — شناسه یکتای مشتری در پورتال خود‌خدمت
  lastName?: string;   // نام خانوادگی
  trainerId?: string;  // مربی اختصاصی (برای پیوند شاگرد به مربی)
  loyaltyPoints?: number; // امتیاز وفاداری (بوفه)
  birthDate?: string;    // تاریخ تولد (ISO) — برای یادآوری تولد
};

export type CustomerTransaction = {
    id: string;
    customerId: string;
    date: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    orderId?: string;
}

export type ExpenseScope = 'buffet' | 'gym' | 'shared';

export type Expense = {
    id: string;
    description: string;
    amount: number;
    date: string;
    scope?: ExpenseScope; // حوزه مالی: بوفه | باشگاه | مشترک (حساب‌ها جدا می‌مانند)
};

export type PurchaseItem = {
    id: string; // Unique ID for the line item itself
    type: 'product' | 'ingredient';
    itemId: string;
    itemName: string; // denormalized for easier display
    quantity: number;
    lineTotalCost: number; // Total cost for the quantity entered
};

export type Purchase = {
    id: string;
    date: string;
    items: PurchaseItem[];
    transportCost: number;
    note: string;
    status: 'active' | 'archived';
};

export type Waste = {
    id: string;
    date: string;
    itemType: 'product' | 'ingredient';
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    cost: number; // quantity * avgBuyPrice at time of waste
    reason: string;
};

// Business unit owner profiles — kept separate so the two businesses
// (بوفه and باشگاه) are always accounted for as two distinct persons/books.
export type BusinessProfile = {
  ownerName?: string;     // نام صاحب/مدیر این واحد
  businessName?: string;  // نام رسمی واحد
  phone?: string;
  email?: string;
};

// نقش‌های سیستم (RBAC) — هم‌راستا با مستندات Enterprise
export type ManagementRole =
  | 'super_admin'
  | 'owner'
  | 'branch_manager'
  | 'reception'
  | 'trainer'
  | 'member'
  | 'accountant'
  | 'buffet_manager'
  | 'buffet_seller'
  | 'warehouse_manager'
  | 'technician'
  | 'cleaner'
  | 'hr'
  | 'it';

export type Account = {
  businessName: string;
  managerName: string;
  email?: string;
  phone?: string;
  avatarImage?: string;
  locale: 'fa-IR';
  currency: 'TOMAN';
  calendar: 'jalali' | 'gregorian';
  // --- تنظیمات جدید ---
  lowStockThreshold?: number;       // آستانه هشدار موجودی کم (عدد)
  paymentGateway?: 'mock' | 'zarinpal' | 'idpay';
  requireManagementAuth?: boolean;  // نیاز به ورود مدیریت با PIN
  adminPin?: string;                // PIN هش‌شده مدیریت (scrypt)
  adminSalt?: string;
  setupComplete?: boolean;          // ویزارد راه‌اندازی انجام شده؟
  enableNotifications?: boolean;    // اعلان‌های محلی (Service Worker)
  // دو واحد تجاری مجزا — حساب‌ها هرگز با هم ترکیب نمی‌شوند
  buffet?: BusinessProfile;         // صاحب بوفه
  gym?: BusinessProfile;         // صاحب باشگاه
  // انطباق مالیاتی و اشتراک مدیریت‌شده
  tax?: TaxSettings;
  subscription?: SubscriptionSettings;
  trainerInviteCode?: string; // کد دعوت ۶ رقمی مربیان
  trainerAccounting?: { defaultGymPercent: number; taxPercent: number; employeeSharePercent: number };
};

export type TaxSettings = {
  enabled: boolean;
  taxpayerId?: string;
  terminalId?: string;
  apiUrl?: string;
  invoiceMode: 'draft' | 'manual' | 'online';
};

export type SubscriptionSettings = {
  plan: 'trial' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'suspended' | 'cancelled';
  validUntil?: string;
  tenantId?: string;
};

export type MemberSession = {
  id: string; title: string; gender: 'male' | 'female' | 'mixed'; days: string; startTime: string; endTime: string; capacity: number; status: 'active' | 'archived';
};

// بازار خدمات مربی، برنامه‌ساز و تسویه سهم‌ها
export type TrainerAvailability = { id: string; trainerId: string; dayOfWeek: number; startTime: string; endTime: string; active: boolean };
export type TrainerHoliday = { id: string; trainerId?: string; date: string; title: string; scope: 'gym' | 'trainer'; };
export type TrainerProfile = { id: string; userId?: string; name: string; avatar?: string; bio?: string; achievements?: string[]; specialties?: string[]; pricePerSession: number; sharePercent: number; phone?: string; whatsapp?: string; instagram?: string; telegram?: string; status: 'pending' | 'approved' | 'rejected'; gymCode?: string; studentCount?: number; };
export type TrainerBooking = { id: string; trainerId: string; customerId: string; date: string; startTime: string; endTime: string; recurringMonthly: boolean; status: 'pending' | 'paid' | 'cancelled'; amount: number; gymShare: number; trainerShare: number; details?: { height?: number; weight?: number; age?: number; goal?: string; allergies?: string; injuries?: string; experience?: string; bodyPhoto?: string; }; };
export type TrainerWalletEntry = { id: string; trainerId: string; bookingId?: string; at: string; amount: number; type: 'earning' | 'withdrawal' | 'adjustment'; description: string; status?: 'pending' | 'approved' | 'paid' | 'rejected'; reference?: string; };
export type WorkoutPlan = { id: string; trainerId: string; customerId: string; title: string; system?: string; notes?: string; days: { day: string; exercises: { name: string; sets?: number; reps?: string; rest?: string; note?: string }[] }[]; price: number; status: 'draft' | 'sent' | 'accepted'; };
export type NutritionPlan = { id: string; trainerId: string; customerId: string; title: string; notes?: string; meals: { name: string; time?: string; calories?: number; note?: string; alternatives: { name: string; amount?: string }[] }[]; price: number; status: 'draft' | 'sent' | 'accepted'; };

// لاگ فعالیت (Audit Log) برای ثبت تغییرات مهم
export type AuditEntry = {
  id: string;
  at: string;       // ISO timestamp
  actor?: string;   // who (admin/cashier/portal)
  action: string;   // مثال: membership.created
  detail?: string;  // توضیحات
  scope?: 'buffet' | 'gym' | 'system';
};


// ----------------------- Membership / Tuition Accounting -----------------------

export type PlanCategory = 'private' | 'regular'; // خصوصی یا عادی
export type PlanPeriod = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export type MembershipPlan = {
  id: string;
  name: string;            // مثال: ماهانه، سالانه طلایی
  category: PlanCategory;  // خصوصی (اقساط در ۱ و ۱۵ ماه) یا عادی
  period: PlanPeriod;      // دوره شهریه
  price: number;           // مبلغ شهریه دوره (تومان)
  description?: string;
  status: 'active' | 'archived';
};

export type MembershipStatus = 'active' | 'expired' | 'paused' | 'cancelled';

export type Membership = {
  id: string;
  customerId: string;
  planId: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  status: MembershipStatus;
  note?: string;
};

export type Installment = {
  id: string;
  dueDate: string;   // ISO
  amount: number;
  paid: boolean;
  paidDate?: string;
  note?: string;
};

export type MembershipInvoiceStatus = 'paid' | 'partial' | 'unpaid' | 'overdue';

export type MembershipInvoice = {
  id: string;
  customerId: string;
  membershipId?: string;
  planId?: string;
  title: string;
  issueDate: string; // ISO
  total: number;
  isInstallment: boolean;
  installments: Installment[];
  status: MembershipInvoiceStatus;
  note?: string;
};


// ----------------------- Rental / Facility Leasing (اجاره‌داری) -----------------------
// اجاره‌داری فضاها به مستأجران ثالث — درآمد آن روی «دفتر باشگاه» ثبت می‌شود و
// هرگز با دفتر بوفه ترکیب نمی‌گردد (حساب دو شخص مجزا).

export type SpaceType = 'buffet' | 'court' | 'hall' | 'studio' | 'parking' | 'locker' | 'adspace' | 'other';
export type LeaseStatus = 'active' | 'expired' | 'terminated';
export type RentInvoiceStatus = 'paid' | 'unpaid' | 'overdue';

export type Space = {
  id: string;
  name: string;
  type: SpaceType;
  area?: number;
  description?: string;
  status: 'active' | 'archived';
};

export type Tenant = {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  note?: string;
  status: 'active' | 'inactive';
};

export type Lease = {
  id: string;
  tenantId: string;
  spaceId: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  monthlyRent: number;
  deposit?: number;
  billingDay: number; // روز سررسید هر ماه (۱ تا ۲۸)
  escalationPct?: number; // افزایش سالانه (٪)
  note?: string;
  status: LeaseStatus;
};

export type RentInvoice = {
  id: string;
  leaseId: string;
  tenantId: string;
  spaceId: string;
  periodLabel: string; // مثال: ۱۴۰۴/۰۵
  dueDate: string;     // ISO
  amount: number;
  status: RentInvoiceStatus;
  paidDate?: string;
};

// ----------------------- HRM (منابع انسانی و حقوق) -----------------------
export type StaffRole = 'trainer' | 'reception' | 'cleaner' | 'manager' | 'other';
export type EmploymentType = 'fulltime' | 'parttime' | 'contract';
export type PayrollStatus = 'paid' | 'unpaid';

export type Staff = {
  id: string;
  name: string;
  role: StaffRole;
  employmentType: EmploymentType;
  phone?: string;
  nationalId?: string;
  monthlySalary: number;
  hireDate: string; // ISO
  status: 'active' | 'inactive';
  note?: string;
  // فیلدهای جدید برای پروفایل عمومی مربی (الهام‌گرفته از گیت‌هاب)
  branch?: string;        // مجموعه / شعبه‌ای که مربی در آن فعالیت می‌کند
  privateRate?: number;   // مبلغ شهریه/جلسه خصوصی (تومان)
  bio?: string;           // رزومه / بیو کوتاه
  specialties?: string[]; // تخصص‌ها (مثال: بدنسازی، یوگا)
};

export type PayrollRecord = {
  id: string;
  staffId: string;
  staffName: string;
  periodLabel: string;
  amount: number;
  issueDate: string; // ISO
  status: PayrollStatus;
  paidDate?: string;
};

// ----------------------- Booking (رزرو کلاس و جلسات مربی) -----------------------
export type BookingStatus = 'booked' | 'cancelled' | 'done';

// کلاس هفتگی (الگو/برنامه)
export type ClassSession = {
  id: string;
  title: string;
  trainerId?: string;
  trainerName?: string;
  dayOfWeek: number; // ۰=شنبه ... ۶=جمعه
  startTime: string; // HH:MM
  durationMin: number;
  capacity: number;
  note?: string;
};

// رزرو مشتری (مشخص / یک‌باره)
export type Booking = {
  id: string;
  memberId?: string;
  memberName: string;
  sessionId?: string;
  title: string;
  trainerId?: string;
  trainerName?: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  durationMin: number;
  fee?: number;
  paid?: boolean;
  status: BookingStatus;
  note?: string;
};

// ----------------------- Attendance (حضور و غیاب) -----------------------
export type AttendanceMethod = 'qr' | 'code' | 'manual' | 'face';
export type AttendanceKind = 'member' | 'staff';

export type Attendance = {
  id: string;
  kind: AttendanceKind;        // عضو یا کارمند
  personId?: string;           // memberId یا staffId
  personName: string;
  role?: string;               // نقش (برای کارکنان) یا «عضو»
  date: string;                // YYYY-MM-DD
  timeIn: string;              // HH:MM
  timeOut?: string;            // HH:MM
  method: AttendanceMethod;
  note?: string;
};

// ----------------------- User Accounts (حساب‌های کاربری و دسترسی) -----------------------
// کاربران سیستم با نقش‌های RBAC؛ ادمین آن‌ها را می‌سازد و سطح دسترسی می‌دهد.
export type UserAccount = {
  id: string;
  username: string;
  name: string;
  role: ManagementRole;
  passwordHash?: string;   // sha256(plain) — محلی/آزمایشی
  staffId?: string;        // پیوند به کارمند (برای مربیان/کارکنان)
  active: boolean;
  createdAt: string;
  mustChangePassword?: boolean; // اگر با رمز پیش‌فرض (مثل تایید درخواست مربی) ساخته شده باشد
};

// ----------------------- Trainer Applications (درخواست همکاری مربی) -----------------------
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type TrainerApplication = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  resume?: string;          // رزومه
  portfolio?: string;       // نمونه کار / لینک
  experience?: string;      // سابقه فعالیت
  status: ApplicationStatus;
  note?: string;            // یادداشت بررسی
  createdAt: string;
  reviewedAt?: string;
  gymCode?: string; // کد ۶ رقمی دعوت باشگاه
};

// ----------------------- Programs (برنامه تمرینی / غذایی) -----------------------
export type ProgramType = 'workout' | 'nutrition';
export type Program = {
  id: string;
  type: ProgramType;
  memberId: string;
  memberName: string;
  trainerId?: string;
  trainerName?: string;
  title: string;
  details: string;          // متن برنامه (خط به خط)
  createdAt: string;
};

// ----------------------- Chat (چت مربی و شاگرد) -----------------------
export type ChatMessage = {
  id: string;
  trainerId: string;
  trainerName: string;
  memberId: string;
  memberName: string;
  from: 'trainer' | 'member';
  text: string;
  at: string;
};

// ----------------------- Help Desk (تیکت‌های پشتیبانی) -----------------------
export type TicketChannel = 'email' | 'sms' | 'phone' | 'portal' | 'walkin';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';

export type TicketMessage = {
  id: string;
  at: string; // ISO
  from: 'customer' | 'agent';
  text: string;
};

export type Ticket = {
  id: string;
  subject: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  channel: TicketChannel;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  assignedTo?: string;
  scope?: 'buffet' | 'gym' | 'system';
  messages: TicketMessage[];
  tags?: string[];
};

// Represents the entire state of the application
export type AppData = {
  products: Product[];
  ingredients: Ingredient[];
  foods: Food[];
  customers: Customer[];
  customerTransactions: CustomerTransaction[];
  orders: Order[];
  purchases: Purchase[];
  manualExpenses: Expense[];
  waste: Waste[];
  account: Account;
  membershipPlans: MembershipPlan[];
  memberships: Membership[];
  membershipInvoices: MembershipInvoice[];
  auditLog: AuditEntry[];
  // اجاره‌داری (فضاها و مستأجران) — درآمد روی دفتر باشگاه
  spaces: Space[];
  tenants: Tenant[];
  leases: Lease[];
  rentInvoices: RentInvoice[];
  // منابع انسانی و حقوق (HRM)
  staff: Staff[];
  payrolls: PayrollRecord[];
  // رزرو کلاس و جلسات مربی (Booking)
  classSessions: ClassSession[];
  bookings: Booking[];
  // تیکت‌های پشتیبانی (Help Desk)
  tickets: Ticket[];
  // حضور و غیاب (Attendance)
  attendances: Attendance[];
  // حساب‌های کاربری و دسترسی (User Accounts)
  users: UserAccount[];
  // درخواست‌های همکاری مربی (Trainer Applications)
  trainerApplications: TrainerApplication[];
  // برنامه‌های تمرینی و غذایی (Programs)
  programs: Program[];
  // چت مربی و شاگرد (Chat)
  chatMessages: ChatMessage[];
  memberSessions?: MemberSession[];
  trainerProfiles?: TrainerProfile[];
  trainerAvailabilities?: TrainerAvailability[];
  trainerHolidays?: TrainerHoliday[];
  trainerBookings?: TrainerBooking[];
  trainerWalletEntries?: TrainerWalletEntry[];
  workoutPlans?: WorkoutPlan[];
  nutritionPlans?: NutritionPlan[];
};
