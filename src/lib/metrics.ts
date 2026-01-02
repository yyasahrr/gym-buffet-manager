import type { AppData } from './types';

export interface Metrics {
  totalRevenue: number;
  totalSales: number;
  totalCOGS: number;
  grossProfit: number;
  totalWaste: number;
  totalExpenses: number;
  netProfit: number;
  inventoryValue: number;
}

export function calculateMetrics(data: AppData): Metrics {
  const totalRevenue = data.orders.reduce((sum, order) => sum + order.total, 0);
  const totalSales = data.orders.length;
  
  const totalCOGS = data.orders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
  
  const grossProfit = totalRevenue - totalCOGS;

  const totalWaste = data.waste.reduce((sum, wasteItem) => sum + wasteItem.cost, 0);
  
  const totalExpenses = data.manualExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  const netProfit = grossProfit - totalWaste - totalExpenses;
  
  const inventoryValue = 
      data.products.reduce((sum, p) => sum + (p.stock * p.avgBuyPrice), 0) +
      data.ingredients.reduce((sum, i) => sum + (i.stock * i.avgBuyPrice), 0);

  return {
    totalRevenue,
    totalSales,
    totalCOGS,
    grossProfit,
    totalWaste,
    totalExpenses,
    netProfit,
    inventoryValue,
  };
}
