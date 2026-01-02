
import { useSyncExternalStore } from 'react';
import type { AppData, Product, Ingredient, Food, Customer, CustomerTransaction, Order, Purchase, Expense, Waste, Account } from './types';
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
  account: {
    businessName: 'بوفه باشگاه',
    managerName: 'مدیر سیستم',
    email: 'yashartavakolnia@gmail.com',
    phone: '09367008618',
    locale: 'fa-IR',
    currency: 'TOMAN',
    calendar: 'jalali',
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

    normalized.manualExpenses = (data.manualExpenses || []).filter((e: Expense | null) => e);
    
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
