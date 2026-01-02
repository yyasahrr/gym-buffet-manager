
export type Product = {
  id: string;
  name: string;
  stock: number;
  avgBuyPrice: number;
  sellPrice: number;
  imageId: string;
  status: 'active' | 'archived';
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

export type Expense = {
    id: string;
    description: string;
    amount: number;
    date: string;
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

export type Account = {
  businessName: string;
  managerName: string;
  phone?: string;
  avatarImage?: string;
  locale: 'fa-IR';
  currency: 'TOMAN';
  calendar: 'jalali' | 'gregorian';
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
};
