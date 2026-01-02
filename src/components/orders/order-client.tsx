'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Plus, Minus, Trash2, ShoppingCart, Loader2, User } from 'lucide-react';
import type { Order, OrderItem, Product, Food, Customer, Ingredient, CustomerTransaction } from '@/lib/types';
import placeholderImages from '@/lib/placeholder-images.json';
import { canFulfillOrderItem, fulfillOrder } from '@/lib/inventory';
import { useAppData, dataStore } from '@/lib/store';

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
import { Input } from '../ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));

type PaymentMethod = 'cash' | 'customer_account';

export default function OrderClient() {
  const { customers, products, foods, ingredients, orders, customerTransactions } = useAppData();
  const [cart, setCart] = useState<OrderItem[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const activeCustomers = useMemo(() => customers.filter(c => c.status === 'active'), [customers]);

  useEffect(() => {
    if (activeCustomers.length > 0 && !selectedCustomerId) {
        const defaultCustomer = activeCustomers.find((c: Customer) => c.name === 'مشتری حضوری');
        if (defaultCustomer) {
            setSelectedCustomerId(defaultCustomer.id);
        } else {
            setSelectedCustomerId(activeCustomers[0].id);
        }
    }
  }, [activeCustomers, selectedCustomerId]);

  useEffect(() => {
    const customer = activeCustomers.find(c => c.id === selectedCustomerId);
    if (customer?.name === 'مشتری حضوری') {
        setPaymentMethod('cash');
    }
  }, [selectedCustomerId, activeCustomers]);

  const customerBalances = useMemo(() => {
    const balances = new Map<string, number>();
    customers.forEach(c => balances.set(c.id, 0));
    customerTransactions.forEach(t => {
        const currentBalance = balances.get(t.customerId) || 0;
        const newBalance = t.type === 'credit' ? currentBalance + t.amount : currentBalance - t.amount;
        balances.set(t.customerId, newBalance);
    });
    return balances;
  }, [customers, customerTransactions]);

  const selectedCustomer = useMemo(() => {
    return activeCustomers.find(c => c.id === selectedCustomerId);
  }, [selectedCustomerId, activeCustomers]);

  const selectedCustomerBalance = useMemo(() => {
      if (!selectedCustomer) return 0;
      return customerBalances.get(selectedCustomer.id) || 0;
  }, [selectedCustomer, customerBalances]);


  const addToCart = (item: Product | Food) => {
    const currentInventory = {
      products: products,
      ingredients: ingredients,
    };
    
    if (!canFulfillOrderItem({item, quantity: 1}, currentInventory, cart)) {
      toast({
        variant: "destructive",
        title: "موجودی ناکافی",
        description: `موجودی برای افزودن "${item.name}" کافی نیست.`,
      });
      return;
    }
  
    setCart((prevCart) => {
      const existingCartItem = prevCart.find((ci) => ci.item.id === item.id);
      if (existingCartItem) {
        return prevCart.map((cartItem) =>
          cartItem.item.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      return [...prevCart, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    const itemInCart = cart.find(ci => ci.item.id === itemId)?.item;
    if (!itemInCart) return;

    const currentQuantityInCart = cart.find(ci => ci.item.id === itemId)?.quantity || 0;
  
    if (newQuantity <= 0) {
      setCart((prevCart) => prevCart.filter((item) => item.item.id !== itemId));
      return;
    }
    
    if (newQuantity > currentQuantityInCart) {
      const currentInventory = { products, ingredients: ingredients };
      const tempCart = cart.map(ci => ci.item.id === itemId ? {...ci, quantity: newQuantity -1 } : ci);
      
      if (!canFulfillOrderItem({item: itemInCart, quantity: 1}, currentInventory, tempCart)) {
        toast({
          variant: "destructive",
          title: "موجودی ناکافی",
          description: `موجودی برای افزودن یک عدد دیگر از "${itemInCart.name}" کافی نیست.`,
        });
        return;
      }
    }

    setCart((prevCart) => 
        prevCart.map((item) => (item.item.id === itemId ? { ...item, quantity: newQuantity } : item))
    );
  };
  
  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.item.id !== itemId));
  };


  const cartTotal = useMemo(() => {
    return cart.reduce((total, cartItem) => total + cartItem.item.sellPrice * cartItem.quantity, 0);
  }, [cart]);
  
  const newBalance = useMemo(() => {
    if (!selectedCustomer || paymentMethod !== 'customer_account') {
      return null;
    }
    return selectedCustomerBalance - cartTotal;
  }, [selectedCustomer, selectedCustomerBalance, cartTotal, paymentMethod]);

  const handleCheckout = () => {
    if (cart.length === 0) {
        toast({ variant: "destructive", title: "سبد خرید خالی" });
        return;
    }
    if (!selectedCustomer) {
        toast({ variant: "destructive", title: "مشتری انتخاب نشده" });
        return;
    }

    if (paymentMethod === 'customer_account' && newBalance !== null && newBalance < 0 && Math.abs(newBalance) > 500000) { // Example credit limit
        // a real app might have credit limit per customer
        toast({ variant: "destructive", title: "اعتبار ناکافی", description: "مانده حساب مشتری برای این تراکنش کافی نیست." });
        return;
    }

    setIsCheckingOut(true);
    
    setTimeout(() => {
        const currentInventory = { products, ingredients };
        const { updatedProducts, updatedIngredients, success } = fulfillOrder(cart, currentInventory);

        if (!success) {
            toast({ variant: "destructive", title: "خطای داخلی", description: "موجودی برای تکمیل سفارش کافی نیست." });
            setIsCheckingOut(false);
            return;
        }
        
        let updatedCustomerTransactions = [...customerTransactions];
        const newOrderId = `ord-${Date.now()}`;

        if (paymentMethod === 'customer_account') {
            const newTransaction: CustomerTransaction = {
                id: `trx-${Date.now()}`,
                customerId: selectedCustomer.id,
                date: new Date().toISOString(),
                type: 'debit',
                amount: cartTotal,
                description: `پرداخت سفارش #${newOrderId.substring(4)}`,
                orderId: newOrderId
            };
            updatedCustomerTransactions.push(newTransaction);
        }

        const newOrder: Order = {
            id: newOrderId,
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.name,
            items: cart,
            total: cartTotal,
            createdAt: new Date().toISOString(),
            status: 'پرداخت شده',
        }

        const updatedOrders = [...orders, newOrder];
        
        dataStore.saveData({
          products: updatedProducts,
          ingredients: updatedIngredients,
          customerTransactions: updatedCustomerTransactions,
          orders: updatedOrders,
        });
    
        toast({
          title: "سفارش ثبت شد!",
          description: `مجموع: ${cartTotal.toLocaleString('fa-IR')} تومان برای ${selectedCustomer.name}.`,
        });
        setCart([]);
        setIsCheckingOut(false);
    }, 500);
  }

  const activeFoods = useMemo(() => foods.filter(f => f.status === 'active'), [foods]);
  const activeProducts = useMemo(() => products.filter(p => p.status === 'active'), [products]);

  const filteredFoods = useMemo(() => activeFoods.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())), [activeFoods, searchQuery]);
  const filteredProducts = useMemo(() => activeProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())), [activeProducts, searchQuery]);

  const ItemGrid = ({ items }: { items: (Product | Food)[] }) => {
    const tempProductMap = new Map(products.map(p => [p.id, p]));
    const tempIngredientMap = new Map(ingredients.map(i => [i.id, i]));
    
    return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => {
        const image = imageMap.get(item.imageId);
        const isFood = 'recipe' in item;
        let stock: number | string;
        
        if (isFood) {
          const recipe = item.recipe;
          if (recipe.length === 0) {
            stock = Infinity;
          } else {
            const possibleCounts = recipe.map(recipeItem => {
              const ingredient = tempIngredientMap.get(recipeItem.ingredientId);
              if (!ingredient || ingredient.stock <= 0 || recipeItem.quantity <= 0) return 0;
              return Math.floor(ingredient.stock / recipeItem.quantity);
            });
            stock = Math.min(...possibleCounts);
          }
        } else {
          stock = tempProductMap.get(item.id)?.stock ?? 0;
        }

        const isAvailable = stock > 0;

        return (
          <Card
            key={item.id}
            onClick={() => isAvailable && addToCart(item)}
            className={cn(
              "cursor-pointer hover:shadow-lg hover:border-primary transition-all group overflow-hidden",
              !isAvailable && "opacity-50 cursor-not-allowed"
            )}
          >
            <CardContent className="p-0">
                <div className="aspect-square relative">
                    {image && <Image src={(item as Food).imageDataUrl || image.imageUrl} alt={item.name} fill className="object-cover transition-transform group-hover:scale-105" data-ai-hint={image.imageHint}/>}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <p className="text-white font-bold text-lg">ناموجود</p>
                      </div>
                    )}
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
    )
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2">
        <div className='mb-4'>
            <Input 
                placeholder="جستجوی غذا یا محصول..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <Tabs defaultValue="foods">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="foods">غذاها</TabsTrigger>
            <TabsTrigger value="products">محصولات</TabsTrigger>
          </TabsList>
          <TabsContent value="foods">
            <ItemGrid items={filteredFoods} />
          </TabsContent>
          <TabsContent value="products">
            <ItemGrid items={filteredProducts} />
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
                {activeCustomers.map(customer => (
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
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(cartItem.item.id)} disabled={isCheckingOut}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        {cart.length > 0 && (
            <CardFooter className="flex flex-col gap-4 mt-4 px-6">
                <Separator />
                
                <div className="w-full space-y-3">
                    <Label>نحوه پرداخت</Label>
                    <RadioGroup
                        value={paymentMethod}
                        onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                        className="grid grid-cols-2 gap-4"
                        disabled={isCheckingOut}
                    >
                        <div>
                            <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                            <Label
                                htmlFor="cash"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                نقدی/کارت
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="customer_account" id="customer_account" className="peer sr-only" disabled={selectedCustomer?.name === 'مشتری حضوری'} />
                            <Label
                                htmlFor="customer_account"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                            >
                                از حساب مشتری
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                {paymentMethod === 'customer_account' && newBalance !== null && (
                <div className="w-full space-y-2 text-sm pt-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">موجودی فعلی</span>
                        <span className={cn(selectedCustomerBalance < 0 && 'text-destructive')}>{selectedCustomerBalance.toLocaleString('fa-IR')} تومان</span>
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

                <div className="w-full flex justify-between text-lg font-semibold pt-2">
                    <span>مجموع</span>
                    <span>{cartTotal.toLocaleString('fa-IR')} تومان</span>
                </div>
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" onClick={handleCheckout} disabled={isCheckingOut || !selectedCustomerId}>
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
        )}
      </Card>
    </div>
  );
}
