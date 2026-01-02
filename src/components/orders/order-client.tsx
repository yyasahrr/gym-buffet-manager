'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Plus, Minus, Trash2, ShoppingCart, Loader2, User } from 'lucide-react';
import { products, foods, ingredients, customers } from '@/lib/data';
import type { OrderItem, Product, Food, Customer } from '@/lib/types';
import placeholderImages from '@/lib/placeholder-images.json';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';

const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));

function getItemCost(item: Product | Food): number {
  if ('avgBuyPrice' in item) {
    return item.avgBuyPrice;
  }
  
  const ingredientMap = new Map(ingredients.map(i => [i.id, i]));
  return item.recipe.reduce((total, recipeItem) => {
    const ingredient = ingredientMap.get(recipeItem.ingredientId);
    return total + (ingredient ? ingredient.avgBuyPrice * recipeItem.quantity : 0);
  }, 0);
}

export default function OrderClient() {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(
    customers.find(c => c.name === 'مشتری حضوری')?.id
  );
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { toast } = useToast();

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [selectedCustomerId]);

  const addToCart = (item: Product | Food) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.item.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.item.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      return [...prevCart, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        return prevCart.filter((item) => item.item.id !== itemId);
      }
      return prevCart.map((item) => (item.item.id === itemId ? { ...item, quantity } : item));
    });
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, cartItem) => total + cartItem.item.sellPrice * cartItem.quantity, 0);
  }, [cart]);
  
  const newBalance = useMemo(() => {
    if (!selectedCustomer || selectedCustomer.name === 'مشتری حضوری') {
      return null;
    }
    return selectedCustomer.balance - cartTotal;
  }, [selectedCustomer, cartTotal]);

  const handleCheckout = () => {
    if (cart.length === 0) {
        toast({
            variant: "destructive",
            title: "سبد خرید خالی",
            description: "نمی‌توان با سبد خرید خالی تسویه حساب کرد.",
        });
        return;
    }

    if (selectedCustomer && newBalance !== null && newBalance < -selectedCustomer.creditLimit) {
      toast({
          variant: "destructive",
          title: "سقف اعتبار رد شده است",
          description: `این سفارش سقف اعتبار ${selectedCustomer.name} به مبلغ ${selectedCustomer.creditLimit.toLocaleString('fa-IR')} تومان را رد می‌کند.`,
      });
      return;
    }

    setIsCheckingOut(true);
    
    // Simulate API call
    setTimeout(() => {
        if (selectedCustomer && newBalance !== null && newBalance < 0 && newBalance >= -selectedCustomer.creditLimit) {
            toast({
                title: "هشدار: موجودی مشتری منفی است",
                description: `موجودی جدید ${selectedCustomer.name} مبلغ ${newBalance.toLocaleString('fa-IR')} تومان خواهد بود.`,
            });
        }
    
        toast({
          title: "سفارش ثبت شد!",
          description: `مجموع: ${cartTotal.toLocaleString('fa-IR')} تومان برای ${selectedCustomer?.name || 'مشتری حضوری'}.`,
        });
        setCart([]);
        setIsCheckingOut(false);
    }, 1500);
  }

  const ItemGrid = ({ items }: { items: (Product | Food)[] }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => {
        const image = imageMap.get(item.imageId);
        return (
          <Card
            key={item.id}
            onClick={() => addToCart(item)}
            className="cursor-pointer hover:shadow-lg hover:border-primary transition-all group overflow-hidden"
          >
            <CardContent className="p-0">
                <div className="aspect-square relative">
                    {image && <Image src={image.imageUrl} alt={item.name} fill className="object-cover transition-transform group-hover:scale-105" data-ai-hint={image.imageHint}/>}
                </div>
            </CardContent>
            <CardHeader className="p-3">
              <CardTitle className="text-sm md:text-base leading-tight font-bold">{item.name}</CardTitle>
              <p className="text-sm md:text-base font-semibold text-primary">{item.sellPrice.toLocaleString('fa-IR')} تومان</p>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="grid lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2">
        <Tabs defaultValue="foods">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="foods">غذاها</TabsTrigger>
            <TabsTrigger value="products">محصولات</TabsTrigger>
          </TabsList>
          <TabsContent value="foods">
            <ItemGrid items={foods} />
          </TabsContent>
          <TabsContent value="products">
            <ItemGrid items={products} />
          </TabsContent>
        </Tabs>
      </div>

      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5"/>
            سفارش فعلی
          </CardTitle>
          <div className="pt-4 space-y-2">
            <Label htmlFor="customer-select">مشتری</Label>
            <Select
              value={selectedCustomerId}
              onValueChange={setSelectedCustomerId}
              disabled={isCheckingOut}
            >
              <SelectTrigger id="customer-select" className='w-full'>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="یک مشتری انتخاب کنید" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[30vh] overflow-y-auto px-6">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">سبد خرید شما خالی است.</p>
            ) : (
              <div className="space-y-4">
                {cart.map((cartItem) => (
                  <div key={cartItem.item.id} className="flex items-center gap-4">
                    <div className="flex-grow">
                      <p className="font-medium">{cartItem.item.name}</p>
                      <p className="text-sm text-muted-foreground">{cartItem.item.sellPrice.toLocaleString('fa-IR')} تومان</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity - 1)}
                        disabled={isCheckingOut}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-4 text-center">{cartItem.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity + 1)}
                        disabled={isCheckingOut}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateQuantity(cartItem.item.id, 0)} disabled={isCheckingOut}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 mt-4 px-6">
            <Separator />
            {selectedCustomer && selectedCustomer.name !== 'مشتری حضوری' && newBalance !== null && (
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">موجودی فعلی</span>
                  <span>{selectedCustomer.balance.toLocaleString('fa-IR')} تومان</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مجموع سفارش</span>
                  <span>-{cartTotal.toLocaleString('fa-IR')} تومان</span>
                </div>
                <Separator/>
                <div className="flex justify-between font-semibold text-base">
                  <span className="text-muted-foreground">موجودی جدید</span>
                  <span className={cn(newBalance < 0 && 'text-destructive')}>
                    {newBalance.toLocaleString('fa-IR')} تومان
                  </span>
                </div>
              </div>
            )}

            <div className="w-full flex justify-between text-lg font-semibold">
                <span>مجموع</span>
                <span>{cartTotal.toLocaleString('fa-IR')} تومان</span>
            </div>
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" onClick={handleCheckout} disabled={cart.length === 0 || isCheckingOut}>
            {isCheckingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                در حال پردازش...
              </>
            ) : (
              'تسویه حساب'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
