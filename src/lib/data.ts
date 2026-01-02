import type { Product, Ingredient, Food, Order, Customer, Expense, Purchase } from './types';

// IMPORTANT: This file is now used only for INITIAL data seeding.
// All subsequent data is managed via localStorage in the respective pages.

export const products: Product[] = [
  { id: 'prod-1', name: 'پروتئین وی', stock: 100, avgBuyPrice: 350000, sellPrice: 500000, imageId: 'protein_powder', status: 'active' },
  { id: 'prod-2', name: 'کراتین', stock: 50, avgBuyPrice: 150000, sellPrice: 250000, imageId: 'creatine_powder', status: 'active' },
  { id: 'prod-3', name: 'نوشیدنی انرژی‌زا', stock: 200, avgBuyPrice: 15000, sellPrice: 30000, imageId: 'energy_drink', status: 'active' },
  { id: 'prod-4', name: 'پروتئین بار', stock: 150, avgBuyPrice: 12000, sellPrice: 25000, imageId: 'protein_bar', status: 'active' },
  { id: 'prod-5', name: 'آب معدنی', stock: 300, avgBuyPrice: 5000, sellPrice: 10000, imageId: 'water_bottle', status: 'active' },
  { id: 'prod-6', name: 'مکمل قبل تمرین', stock: 0, avgBuyPrice: 250000, sellPrice: 400000, imageId: 'pre_workout', status: 'archived' },
];

export const ingredients: Ingredient[] = [
  { id: 'ing-1', name: 'سینه مرغ', stock: 50, avgBuyPrice: 80000, unit: 'kg', status: 'active' },
  { id: 'ing-2', name: 'کاهو رومانو', stock: 20, avgBuyPrice: 20000, unit: 'count', status: 'active' },
  { id: 'ing-3', name: 'کینوا', stock: 30, avgBuyPrice: 100000, unit: 'kg', status: 'active' },
  { id: 'ing-4', name: 'آووکادو', stock: 40, avgBuyPrice: 15000, unit: 'count', status: 'active' },
  { id: 'ing-5', name: 'گوجه فرنگی', stock: 60, avgBuyPrice: 30000, unit: 'kg', status: 'active' },
  { id: 'ing-6', name: 'نان گندم کامل', stock: 0, avgBuyPrice: 40000, unit: 'count', status: 'archived' },
  { id: 'ing-7', name: 'تخم مرغ', stock: 100, avgBuyPrice: 2000, unit: 'count', status: 'active' },
];

export const foods: Food[] = [
  {
    id: 'food-1',
    name: 'سالاد مرغ گریل شده',
    recipe: [
      { ingredientId: 'ing-1', quantity: 0.2 }, // 200g
      { ingredientId: 'ing-2', quantity: 1 }, // 1 head
      { ingredientId: 'ing-5', quantity: 0.05 }, // 50g
    ],
    sellPrice: 125000,
    imageId: 'chicken_salad',
    status: 'active'
  },
  {
    id: 'food-2',
    name: 'کاسه کینوا',
    recipe: [
      { ingredientId: 'ing-3', quantity: 0.15 }, // 150g
      { ingredientId: 'ing-4', quantity: 0.5 }, // half avocado
      { ingredientId: 'ing-5', quantity: 0.05 }, // 50g
    ],
    sellPrice: 100000,
    imageId: 'quinoa_bowl',
    status: 'active'
  },
  {
    id: 'food-3',
    name: 'تست آووکادو',
    recipe: [
      { ingredientId: 'ing-6', quantity: 2 }, // 2 slices
      { ingredientId: 'ing-4', quantity: 1 }, // 1 avocado
      { ingredientId: 'ing-7', quantity: 2 }, // 2 eggs
    ],
    sellPrice: 85000,
    imageId: 'avocado_toast',
    status: 'archived'
  },
];

export const customers: Customer[] = [
    { id: 'cust-1', name: 'علی رضایی', balance: 500000 },
    { id: 'cust-2', name: 'زهرا احمدی', balance: -120500 },
    { id: 'cust-3', name: 'محمد حسینی', balance: 0 },
    { id: 'cust-4', name: 'مشتری حضوری', balance: 0 },
];

export const recentOrders: Order[] = [
    { id: 'ord-1', customerName: 'علی رضایی', customerId: 'cust-1', items: [{ item: foods[0], quantity: 1 }], total: 125000, createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), status: 'پرداخت شده' },
    { id: 'ord-2', customerName: 'زهرا احمدی', customerId: 'cust-2', items: [{ item: products[0], quantity: 1 }, { item: foods[2], quantity: 1 }], total: 585000, createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), status: 'پرداخت شده' },
    { id: 'ord-3', customerName: 'محمد حسینی', customerId: 'cust-3', items: [{ item: products[2], quantity: 2 }], total: 60000, createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), status: 'در انتظار پرداخت' },
    { id: 'ord-4', customerName: 'مشتری حضوری', customerId: 'cust-4', items: [{ item: foods[1], quantity: 2 }], total: 200000, createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), status: 'پرداخت شده' },
    { id: 'ord-5', customerName: 'علی رضایی', customerId: 'cust-1', items: [{ item: products[3], quantity: 3 }], total: 75000, createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), status: 'پرداخت شده' },
];

export const expenses: Expense[] = [];
export const purchases: Purchase[] = [];
