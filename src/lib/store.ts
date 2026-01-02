import { useSyncExternalStore } from 'react';
import type { AppData, Product, Ingredient, Food, Customer, Order, Purchase, Expense } from './types';
import { products as initialProducts, ingredients as initialIngredients, foods as initialFoods, customers as initialCustomers, recentOrders as initialOrders, purchases as initialPurchases, expenses as initialExpenses } from './data';

const { AbortController, AbortSignal } = typeof window !== 'undefined' ? window : { AbortController: function() { return { signal: {} as AbortSignal, abort: () => {} } }, AbortSignal: {} as any };


const STORE_VERSION = '1';
const VERSION_KEY = 'gym-canteen-version';

const KEYS = {
  PRODUCTS: 'gym-canteen-products',
  INGREDIENTS: 'gym-canteen-ingredients',
  FOODS: 'gym-canteen-foods',
  CUSTOMERS: 'gym-canteen-customers',
  ORDERS: 'gym-canteen-orders',
  PURCHASES: 'gym-canteen-purchases',
  MANUAL_EXPENSES: 'gym-canteen-expenses',
};

const INITIAL_DATA: AppData = {
  products: initialProducts,
  ingredients: initialIngredients,
  foods: initialFoods,
  customers: initialCustomers,
  orders: initialOrders,
  purchases: initialPurchases,
  manualExpenses: initialExpenses,
};

let appData: AppData = { ...INITIAL_DATA };
let listeners: (() => void)[] = [];

function loadData(): AppData {
  if (typeof window === 'undefined') {
    return { ...INITIAL_DATA };
  }
  
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== STORE_VERSION) {
      // Clear old data if version mismatch
      Object.values(KEYS).forEach(key => localStorage.removeItem(key));
      localStorage.setItem(VERSION_KEY, STORE_VERSION);
      // Seed with initial data
      Object.entries(INITIAL_DATA).forEach(([key, value]) => {
          const storageKey = KEYS[key.toUpperCase().replace(/([A-Z])/g, '_$1').substring(1) as keyof typeof KEYS];
          if(storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(value));
          }
      });

      return { ...INITIAL_DATA };
    }

    const loadedData = {
      products: JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || 'null') || INITIAL_DATA.products,
      ingredients: JSON.parse(localStorage.getItem(KEYS.INGREDIENTS) || 'null') || INITIAL_DATA.ingredients,
      foods: JSON.parse(localStorage.getItem(KEYS.FOODS) || 'null') || INITIAL_DATA.foods,
      customers: JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || 'null') || INITIAL_DATA.customers,
      orders: JSON.parse(localStorage.getItem(KEYS.ORDERS) || 'null') || INITIAL_DATA.orders,
      purchases: JSON.parse(localStorage.getItem(KEYS.PURCHASES) || 'null') || INITIAL_DATA.purchases,
      manualExpenses: JSON.parse(localStorage.getItem(KEYS.MANUAL_EXPENSES) || 'null') || INITIAL_DATA.manualExpenses,
    };
    // Seed initial data if a key is missing
    let dataChanged = false;
    if (!localStorage.getItem(KEYS.PRODUCTS)) {
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_DATA.products));
        dataChanged = true;
    }
     if (!localStorage.getItem(KEYS.INGREDIENTS)) {
        localStorage.setItem(KEYS.INGREDIENTS, JSON.stringify(INITIAL_DATA.ingredients));
        dataChanged = true;
    }
     if (!localStorage.getItem(KEYS.FOODS)) {
        localStorage.setItem(KEYS.FOODS, JSON.stringify(INITIAL_DATA.foods));
        dataChanged = true;
    }
     if (!localStorage.getItem(KEYS.CUSTOMERS)) {
        localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(INITIAL_DATA.customers));
        dataChanged = true;
    }
     if (!localStorage.getItem(KEYS.ORDERS)) {
        localStorage.setItem(KEYS.ORDERS, JSON.stringify(INITIAL_DATA.orders));
        dataChanged = true;
    }
     if (!localStorage.getItem(KEYS.PURCHASES)) {
        localStorage.setItem(KEYS.PURCHASES, JSON.stringify(INITIAL_DATA.purchases));
        dataChanged = true;
    }
     if (!localStorage.getItem(KEYS.MANUAL_EXPENSES)) {
        localStorage.setItem(KEYS.MANUAL_EXPENSES, JSON.stringify(INITIAL_DATA.manualExpenses));
        dataChanged = true;
    }

    return loadedData;
  } catch (error) {
    console.error("Failed to load data from localStorage", error);
    return { ...INITIAL_DATA };
  }
}

function saveData(data: Partial<AppData>) {
  if (typeof window === 'undefined') return;
  try {
    if(data.products) localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(data.products));
    if(data.ingredients) localStorage.setItem(KEYS.INGREDIENTS, JSON.stringify(data.ingredients));
    if(data.foods) localStorage.setItem(KEYS.FOODS, JSON.stringify(data.foods));
    if(data.customers) localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(data.customers));
    if(data.orders) localStorage.setItem(KEYS.ORDERS, JSON.stringify(data.orders));
    if(data.purchases) localStorage.setItem(KEYS.PURCHASES, JSON.stringify(data.purchases));
    if(data.manualExpenses) localStorage.setItem(KEYS.MANUAL_EXPENSES, JSON.stringify(data.manualExpenses));
    
    appData = { ...appData, ...data };
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
  // Listen for changes in other tabs
  window.addEventListener('storage', (event) => {
    if (Object.values(KEYS).includes(event.key || '')) {
      notify();
    }
  });
}

export const dataStore = {
  subscribe,
  getSnapshot,
  saveData,
};

export function useAppData(): AppData {
  return useSyncExternalStore(dataStore.subscribe, dataStore.getSnapshot, dataStore.getSnapshot);
}
