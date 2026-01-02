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
  id: string;
  name: string;
  recipe: RecipeItem[];
  sellPrice: number;
  imageId: string; // For placeholder fallback
  imageDataUrl?: string | null; // For uploaded images
  status: 'active' | 'archived';
};

export type OrderItem = {
  item: Product | Food;
  quantity: number;
};

export type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  customerName: string;
  customerId: string;
  createdAt: string;
  status: 'پرداخت شده' | 'در انتظار پرداخت';
};

export type Customer = {
  id: string;
  name: string;
  balance: number; // Positive is credit, negative is debt
};

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
};
