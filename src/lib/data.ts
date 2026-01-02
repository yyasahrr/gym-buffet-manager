import type { Product, Ingredient, Food, Order, Customer } from './types';

export const products: Product[] = [
  { id: 'prod-1', name: 'Whey Protein', stock: 100, avgBuyPrice: 35.50, sellPrice: 50.00, imageId: 'protein_powder' },
  { id: 'prod-2', name: 'Creatine', stock: 50, avgBuyPrice: 15.00, sellPrice: 25.00, imageId: 'creatine_powder' },
  { id: 'prod-3', name: 'Energy Drink', stock: 200, avgBuyPrice: 1.50, sellPrice: 3.00, imageId: 'energy_drink' },
  { id: 'prod-4', name: 'Protein Bar', stock: 150, avgBuyPrice: 1.20, sellPrice: 2.50, imageId: 'protein_bar' },
  { id: 'prod-5', name: 'Mineral Water', stock: 300, avgBuyPrice: 0.50, sellPrice: 1.00, imageId: 'water_bottle' },
  { id: 'prod-6', name: 'Pre-Workout', stock: 40, avgBuyPrice: 25.00, sellPrice: 40.00, imageId: 'pre_workout' },
];

export const ingredients: Ingredient[] = [
  { id: 'ing-1', name: 'Chicken Breast', stock: 50, avgBuyPrice: 8.00, imageId: 'chicken_breast' },
  { id: 'ing-2', name: 'Romaine Lettuce', stock: 20, avgBuyPrice: 2.00, imageId: 'lettuce' },
  { id: 'ing-3', name: 'Quinoa', stock: 30, avgBuyPrice: 10.00, imageId: 'quinoa' },
  { id: 'ing-4', name: 'Avocado', stock: 40, avgBuyPrice: 1.50, imageId: 'avocado' },
  { id: 'ing-5', name: 'Tomato', stock: 60, avgBuyPrice: 3.00, imageId: 'tomato' },
  { id: 'ing-6', name: 'Whole Wheat Bread', stock: 25, avgBuyPrice: 4.00, imageId: 'bread' },
  { id: 'ing-7', name: 'Egg', stock: 100, avgBuyPrice: 0.20, imageId: 'egg' },
];

export const foods: Food[] = [
  {
    id: 'food-1',
    name: 'Grilled Chicken Salad',
    recipe: [
      { ingredientId: 'ing-1', quantity: 0.2 }, // 200g
      { ingredientId: 'ing-2', quantity: 0.1 }, // 100g
      { ingredientId: 'ing-5', quantity: 0.05 }, // 50g
    ],
    sellPrice: 12.50,
    imageId: 'chicken_salad'
  },
  {
    id: 'food-2',
    name: 'Quinoa Bowl',
    recipe: [
      { ingredientId: 'ing-3', quantity: 0.15 }, // 150g
      { ingredientId: 'ing-4', quantity: 0.5 }, // half avocado
      { ingredientId: 'ing-5', quantity: 0.05 }, // 50g
    ],
    sellPrice: 10.00,
    imageId: 'quinoa_bowl'
  },
  {
    id: 'food-3',
    name: 'Avocado Toast',
    recipe: [
      { ingredientId: 'ing-6', quantity: 2 }, // 2 slices
      { ingredientId: 'ing-4', quantity: 1 }, // 1 avocado
      { ingredientId: 'ing-7', quantity: 2 }, // 2 eggs
    ],
    sellPrice: 8.50,
    imageId: 'avocado_toast'
  },
];

export const customers: Customer[] = [
    { id: 'cust-1', name: 'Alice Johnson', balance: 50.00, creditLimit: 100.00 },
    { id: 'cust-2', name: 'Bob Williams', balance: 120.50, creditLimit: 50.00 },
    { id: 'cust-3', name: 'Charlie Brown', balance: -25.00, creditLimit: 200.00 },
    { id: 'cust-4', name: 'Walk-in Customer', balance: 0, creditLimit: 0 },
];

export const recentOrders: Order[] = [
    { id: 'ord-1', customerName: 'Alice Johnson', items: [{ item: foods[0], quantity: 1 }], total: 12.50, createdAt: new Date(Date.now() - 3600000 * 1).toISOString() },
    { id: 'ord-2', customerName: 'Bob Williams', items: [{ item: products[0], quantity: 1 }, { item: foods[2], quantity: 1 }], total: 58.50, createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: 'ord-3', customerName: 'Charlie Brown', items: [{ item: products[2], quantity: 2 }], total: 6.00, createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
    { id: 'ord-4', name: 'Diana Prince', customerName: 'Diana Prince', items: [{ item: foods[1], quantity: 2 }], total: 20.00, createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: 'ord-5', customerName: 'Ethan Hunt', items: [{ item: products[3], quantity: 3 }], total: 7.50, createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
];
