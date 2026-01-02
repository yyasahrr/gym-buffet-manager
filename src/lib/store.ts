import { useSyncExternalStore } from 'react';
import type { AppData } from './types';
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

const STORE_VERSION = '1.2'; // Version for the single-object store
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
};

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
      
      localStorage.setItem(VERSION_KEY, STORE_VERSION);
      localStorage.setItem(DATA_KEY, JSON.stringify(INITIAL_DATA));
      
      return { ...INITIAL_DATA };
    }

    const loadedData = JSON.parse(rawData);
    
    // Basic validation to ensure it's not malformed
    if (typeof loadedData !== 'object' || loadedData === null || !loadedData.products) {
        throw new Error("Loaded data is not a valid AppData object.");
    }
    
    // Ensure all top-level keys exist, falling back to initial data if not
    let dataChanged = false;
    for (const key of Object.keys(INITIAL_DATA) as Array<keyof AppData>) {
        if (!loadedData.hasOwnProperty(key)) {
            loadedData[key] = INITIAL_DATA[key];
            dataChanged = true;
        }
    }
    if (dataChanged) {
        console.warn("Loaded data was missing keys, patched with initial data.");
        localStorage.setItem(DATA_KEY, JSON.stringify(loadedData));
    }


    return loadedData as AppData;
  } catch (error) {
    console.error("Failed to load or parse data from localStorage, falling back to initial data.", error);
    // If anything goes wrong, reset to a known good state
    localStorage.setItem(VERSION_KEY, STORE_VERSION);
    localStorage.setItem(DATA_KEY, JSON.stringify(INITIAL_DATA));
    return { ...INITIAL_DATA };
  }
}

function saveData(dataUpdate: Partial<AppData>) {
  if (typeof window === 'undefined') return;
  
  try {
    // Perform an atomic read-modify-write
    const currentData = loadData();
    const newData = { ...currentData, ...dataUpdate };

    // Basic validation before saving
    if (!newData || typeof newData !== 'object' || !newData.products) {
        console.error("Attempted to save invalid data. Aborting.", newData);
        // Optionally, throw an error or show a toast to the user
        return;
    }

    localStorage.setItem(DATA_KEY, JSON.stringify(newData));
    
    // After a successful save, notify listeners
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
  // Reload the single source of truth from storage
  appData = loadData();
  // Notify all subscribed components that the data has changed
  emit();
}

// Initial load
if (typeof window !== 'undefined') {
  appData = loadData();
  // Listen for changes in other tabs
  window.addEventListener('storage', (event) => {
    // If our main data key changes, notify this tab
    if (event.key === DATA_KEY) {
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
  // useSyncExternalStore is the correct hook for subscribing to external mutable sources like localStorage
  return useSyncExternalStore(dataStore.subscribe, dataStore.getSnapshot, dataStore.getSnapshot);
}
