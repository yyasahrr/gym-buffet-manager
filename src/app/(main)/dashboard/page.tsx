'use client';

import { DollarSign, Package, Users, UtensilsCrossed } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Header } from '@/components/header';
import { StatCard } from '@/components/dashboard/stat-card';
import { OverviewChart } from '@/components/dashboard/overview-chart';
import { RecentSales } from '@/components/dashboard/recent-sales';
import { useEffect, useState } from 'react';
import type { Order, Product, Ingredient } from '@/lib/types';
import { BestSellers } from '@/components/dashboard/best-sellers';

const ORDERS_STORAGE_KEY = 'gym-canteen-orders';
const PRODUCTS_STORAGE_KEY = 'gym-canteen-products';
const INGREDIENTS_STORAGE_KEY = 'gym-canteen-ingredients';


export default function DashboardPage() {
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [inventoryValue, setInventoryValue] = useState(0);
    const [totalSales, setTotalSales] = useState(0);

    useEffect(() => {
        const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
        if (storedOrders) {
            const orders: Order[] = JSON.parse(storedOrders);
            const revenue = orders.reduce((sum, order) => sum + order.total, 0);
            setTotalRevenue(revenue);
            setTotalSales(orders.length);
        }

        const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
        let currentInventoryValue = 0;
        if(storedProducts) {
            const products: Product[] = JSON.parse(storedProducts);
            currentInventoryValue += products.reduce((sum, product) => sum + (product.stock * product.avgBuyPrice), 0);
        }
        
        const storedIngredients = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
        if(storedIngredients) {
            const ingredients: Ingredient[] = JSON.parse(storedIngredients);
            currentInventoryValue += ingredients.reduce((sum, ingredient) => sum + (ingredient.stock * ingredient.avgBuyPrice), 0);
        }

        setInventoryValue(currentInventoryValue);

    }, []);

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="داشبورد" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <StatCard
            title="درآمد کل"
            value={`${totalRevenue.toLocaleString('fa-IR')} تومان`}
            icon={DollarSign}
            description={`${totalSales.toLocaleString('fa-IR')} فروش`}
          />
          <StatCard
            title="سود کل (نمایشی)"
            value="۱۲,۸۷۴,۲۱۰ تومان"
            icon={DollarSign}
            description="در حال حاضر ثابت است"
          />
          <StatCard
            title="ارزش موجودی"
            value={`${inventoryValue.toLocaleString('fa-IR')} تومان`}
            icon={Package}
            description="ارزش کل محصولات و مواد اولیه"
          />
          <StatCard
            title="ارزش ضایعات (نمایشی)"
            value="۸۴۲,۵۰۰ تومان"
            icon={UtensilsCrossed}
            description="در حال حاضر ثابت است"
          />
        </div>
        <div className="mt-8 grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>نمای کلی</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <OverviewChart />
            </CardContent>
          </Card>
          <BestSellers />
        </div>
        <div className="mt-8">
            <Card>
                <CardHeader>
                <CardTitle>فروش‌های اخیر</CardTitle>
                <CardDescription>
                    آخرین سفارشات ثبت شده در سیستم.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <RecentSales />
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
