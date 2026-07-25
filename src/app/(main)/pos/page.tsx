'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, CheckCircle2, Tag, User } from 'lucide-react';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppData, dataStore } from '@/lib/store';
import { fulfillOrder, calculateOrderItemCost } from '@/lib/inventory';
import { earnPoints, pointsToToman } from '@/lib/loyalty';
import { logAudit } from '@/lib/audit';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Product, OrderItem, Order } from '@/lib/types';

const fmt = (n: number) => `${(n || 0).toLocaleString('fa-IR')} تومان`;

export default function PosPage() {
  const { products, ingredients, customers } = useAppData();
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setIsClient(true), []);

  const categories = useMemo(() => {
    const set = new Set((products || []).map((p) => p.category || 'سایر'));
    return ['all', ...Array.from(set)];
  }, [products]);

  const activeProducts = useMemo(
    () => (products || []).filter((p) => p.status === 'active' && (activeCat === 'all' || (p.category || 'سایر') === activeCat)),
    [products, activeCat]
  );

  const addToCart = (product: Product) => {
    setCart((c) => {
      const existing = c.find((i) => i.item.id === product.id);
      if (existing) {
        return c.map((i) => (i.item.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...c, { item: { ...product }, quantity: 1 }];
    });
  };
  const decCart = (id: string) =>
    setCart((c) => c.map((i) => (i.item.id === id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i)).filter((i) => i.quantity > 0));
  const removeCart = (id: string) => setCart((c) => c.filter((i) => i.item.id !== id));
  const clearCart = () => setCart([]);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.item.sellPrice * i.quantity, 0), [cart]);
  const selectedCustomer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId]);
  const customerPoints = selectedCustomer?.loyaltyPoints || 0;
  const redeemToman = pointsToToman(customerPoints);

  const checkout = () => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'سبد خرید خالی است' });
      return;
    }
    setBusy(true);
    try {
      const currentInventory = { products, ingredients };
      const { updatedProducts, success } = fulfillOrder(cart, currentInventory);
      if (!success) {
        toast({ variant: 'destructive', title: 'خطا', description: 'موجودی انبار برای این فروش کافی نیست.' });
        setBusy(false);
        return;
      }
      const newOrderId = `ord-${Date.now()}`;
      const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));
      const productMap = new Map(products.map((p) => [p.id, p]));
      const totalCost = cart.reduce((sum, ci) => sum + calculateOrderItemCost(ci.item as Product, ingredientMap, productMap) * ci.quantity, 0);

      const newOrder: Order = {
        id: newOrderId,
        customerId: selectedCustomer?.id || 'walk-in',
        customerName: selectedCustomer?.name || 'مشتری حضوری',
        items: cart.map((ci) => ({
          item: { id: ci.item.id, name: ci.item.name, sellPrice: ci.item.sellPrice, imageId: ci.item.imageId },
          quantity: ci.quantity,
        })),
        total: cartTotal,
        totalCost,
        createdAt: new Date().toISOString(),
        status: 'پرداخت شده',
      };

      const current = dataStore.getSnapshot();

      const updates: Parameters<typeof dataStore.saveData>[0] = {
        products: updatedProducts,
        orders: [...(current.orders || []), newOrder],
      };

      let earned = 0;
      if (selectedCustomer) {
        earned = earnPoints(cartTotal);
        updates.customers = (current.customers || []).map((c) =>
          c.id === selectedCustomer.id ? { ...c, loyaltyPoints: (c.loyaltyPoints || 0) + earned } : c
        );
      }

      dataStore.saveData(updates);
      logAudit('order.created', `فروش POS: ${fmt(cartTotal)}`, 'buffet', selectedCustomer?.name);

      toast({
        title: 'فروش ثبت شد',
        description: `${fmt(cartTotal)}${earned ? ` — ${earned} امتیاز وفاداری` : ''}`,
      });
      clearCart();
      setCustomerId('');
    } finally {
      setBusy(false);
    }
  };

  if (!isClient) {
    return (
      <div className="flex flex-col h-full">
        <Header breadcrumbs={[]} activeBreadcrumb="فروشگاه (POS)" />
        <main className="flex-1 p-4 sm:px-6 sm:py-6">
          <PageHeader title="فروشگاه (POS)" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="فروشگاه (POS)" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="فروشگاه (POS)" />

        <div className="grid gap-4 md:grid-cols-3">
          {/* Product grid */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Button key={c} size="sm" variant={activeCat === c ? 'default' : 'outline'} onClick={() => setActiveCat(c)}>
                  {c === 'all' ? 'همه' : c}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeProducts.map((p) => {
                const inCart = cart.find((i) => i.item.id === p.id)?.quantity || 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="relative rounded-lg border bg-card p-3 text-right hover:border-primary transition-colors"
                  >
                    <p className="font-medium leading-tight">{p.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{fmt(p.sellPrice)}</p>
                    <p className="text-xs text-muted-foreground">موجودی: {p.stock}</p>
                    {inCart > 0 && (
                      <Badge className="absolute -top-2 -left-2 bg-primary">{inCart}</Badge>
                    )}
                  </button>
                );
              })}
              {activeProducts.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-8">محصولی یافت نشد.</p>
              )}
            </div>
          </div>

          {/* Cart */}
          <div>
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> سبد فروش</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">سبد خالی است.</p>
                  ) : (
                    cart.map((i) => (
                      <div key={i.item.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{i.item.name}</p>
                          <p className="text-xs text-muted-foreground">{fmt(i.item.sellPrice)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => decCart(i.item.id)}><Minus className="h-3 w-3" /></Button>
                          <span className="w-5 text-center text-sm">{i.quantity}</span>
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => addToCart(i.item as Product)}><Plus className="h-3 w-3" /></Button>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeCart(i.item.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t pt-2 space-y-2">
                  <Label className="flex items-center gap-1"><User className="h-4 w-4" /> مشتری (برای امتیاز)</Label>
                  <Select value={customerId || '__none__'} onValueChange={(v) => setCustomerId(v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="مشتری حضوری" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون مشتری (حضوری)</SelectItem>
                      {customers.filter((c) => c.status === 'active').map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}{c.loyaltyPoints ? ` — ${c.loyaltyPoints} امتیاز` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCustomer && customerPoints > 0 && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1"><Tag className="h-3 w-3" /> {customerPoints} امتیاز = {fmt(redeemToman)} تخفیف احتمالی</p>
                  )}

                  <div className="flex justify-between font-bold text-lg">
                    <span>جمع کل</span>
                    <span className="text-primary">{fmt(cartTotal)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={clearCart} disabled={cart.length === 0}>پاک کردن</Button>
                    <Button className="flex-1" onClick={checkout} disabled={cart.length === 0 || busy}>
                      <CheckCircle2 className="ml-2 h-4 w-4" /> تسویه
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
