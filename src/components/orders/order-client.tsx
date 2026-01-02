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
  CardDescription,
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
    customers.find(c => c.name === 'Walk-in Customer')?.id
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
    if (!selectedCustomer || selectedCustomer.name === 'Walk-in Customer') {
      return null;
    }
    return selectedCustomer.balance - cartTotal;
  }, [selectedCustomer, cartTotal]);

  const handleCheckout = () => {
    if (cart.length === 0) {
        toast({
            variant: "destructive",
            title: "Empty Cart",
            description: "Cannot checkout with an empty cart.",
        });
        return;
    }

    if (selectedCustomer && newBalance !== null && newBalance < -selectedCustomer.creditLimit) {
      toast({
          variant: "destructive",
          title: "Credit Limit Exceeded",
          description: `This order would exceed ${selectedCustomer.name}'s credit limit of $${selectedCustomer.creditLimit.toFixed(2)}.`,
      });
      return;
    }

    setIsCheckingOut(true);
    
    // Simulate API call
    setTimeout(() => {
        if (selectedCustomer && newBalance !== null && newBalance < 0 && newBalance >= -selectedCustomer.creditLimit) {
            toast({
                title: "Warning: Customer Balance Negative",
                description: `${selectedCustomer.name}'s new balance will be $${newBalance.toFixed(2)}.`,
            });
        }
    
        toast({
          title: "Order Placed!",
          description: `Total: $${cartTotal.toFixed(2)} for ${selectedCustomer?.name || 'Walk-in Customer'}.`,
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
                <div className="aspect-video relative">
                    {image && <Image src={image.imageUrl} alt={item.name} fill className="object-cover transition-transform group-hover:scale-105" data-ai-hint={image.imageHint}/>}
                </div>
            </CardContent>
            <CardHeader className="p-3">
              <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
              <p className="text-lg font-semibold text-primary">${item.sellPrice.toFixed(2)}</p>
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="foods">Foods</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>
          <TabsContent value="foods">
            <ItemGrid items={foods} />
          </TabsContent>
          <TabsContent value="products">
            <ItemGrid items={products} />
          </TabsContent>
        </Tabs>
      </div>

      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5"/>
            Current Order
          </CardTitle>
          <div className="pt-4 space-y-2">
            <Label htmlFor="customer-select">Customer</Label>
            <Select
              value={selectedCustomerId}
              onValueChange={setSelectedCustomerId}
              disabled={isCheckingOut}
            >
              <SelectTrigger id="customer-select" className='w-full'>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select a customer" />
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
              <p className="text-muted-foreground text-center py-10">Your cart is empty.</p>
            ) : (
              <div className="space-y-4">
                {cart.map((cartItem) => (
                  <div key={cartItem.item.id} className="flex items-center gap-4">
                    <div className="flex-grow">
                      <p className="font-medium">{cartItem.item.name}</p>
                      <p className="text-sm text-muted-foreground">${cartItem.item.sellPrice.toFixed(2)}</p>
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
            {selectedCustomer && selectedCustomer.name !== 'Walk-in Customer' && newBalance !== null && (
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span>${selectedCustomer.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Total</span>
                  <span>-${cartTotal.toFixed(2)}</span>
                </div>
                <Separator/>
                <div className="flex justify-between font-semibold text-base">
                  <span className="text-muted-foreground">New Balance</span>
                  <span className={cn(newBalance < 0 && 'text-destructive')}>
                    ${newBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="w-full flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
            </div>
          <Button className="w-full bg-primary hover:bg-primary/90" size="lg" onClick={handleCheckout} disabled={cart.length === 0 || isCheckingOut}>
            {isCheckingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Checkout'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
