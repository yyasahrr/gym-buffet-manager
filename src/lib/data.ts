import type { Product, Ingredient, Food, Order, Customer, Expense, Purchase, CustomerTransaction } from './types';

// IMPORTANT: This file is now used only for INITIAL data seeding.
// All subsequent data is managed via localStorage in the respective pages.

export const products: Product[] = [];

export const ingredients: Ingredient[] = [];

export const foods: Food[] = [];

export const customers: Customer[] = [
    { id: 'cust-4', name: 'مشتری حضوری', status: 'active' },
];

export const customerTransactions: CustomerTransaction[] = [];

export const recentOrders: Order[] = [];

export const expenses: Expense[] = [];
export const purchases: Purchase[] = [];
