export type Product = {
  id: string;
  name: string;
  stock: number;
  avgBuyPrice: number;
  sellPrice: number;
  imageId: string;
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
  variantName?: string; // e.g., "Single" vs "Pack of 30" for eggs
  stock: number;
  avgBuyPrice: number; // Price per single unit ('g', 'ml', 'count')
  imageId: string;
  unit: Unit;
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
  imageId: string;
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
  creditLimit: number;
};