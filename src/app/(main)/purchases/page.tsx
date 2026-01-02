'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { format as formatJalali } from 'date-fns-jalali';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { type Ingredient, type Product, type Purchase, type PurchaseItem, unitLabels } from '@/lib/types';
import { ingredients as initialIngredients, products as initialProducts, purchases as initialPurchases } from '@/lib/data';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const INGREDIENTS_STORAGE_KEY = 'gym-canteen-ingredients';
const PRODUCTS_STORAGE_KEY = 'gym-canteen-products';
const PURCHASES_STORAGE_KEY = 'gym-canteen-purchases';

export default function PurchasesPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // New state for multi-line purchase form
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString());
  const [transportCost, setTransportCost] = useState('');
  const [note, setNote] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<Partial<PurchaseItem>[]>([{}]);

  const { toast } = useToast();

  useEffect(() => {
    const storedIngredients = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
    setIngredients(storedIngredients ? JSON.parse(storedIngredients) : initialIngredients);

    const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    setProducts(storedProducts ? JSON.parse(storedProducts) : initialProducts);
    
    const storedPurchases = localStorage.getItem(PURCHASES_STORAGE_KEY);
    setPurchases(storedPurchases ? JSON.parse(storedPurchases) : initialPurchases);
  }, []);

  const activeIngredients = useMemo(() => ingredients.filter(i => i.status === 'active'), [ingredients]);
  const activeProducts = useMemo(() => products.filter(p => p.status === 'active'), [products]);
  
  const allItemsMap = useMemo(() => {
    const map = new Map<string, (Product | Ingredient) & { type: 'product' | 'ingredient' }>();
    activeIngredients.forEach(i => map.set(`ingredient-${i.id}`, { ...i, type: 'ingredient' }));
    activeProducts.forEach(p => map.set(`product-${p.id}`, { ...p, type: 'product' }));
    return map;
  }, [activeIngredients, activeProducts]);

  const resetForm = () => {
    setPurchaseDate(new Date().toISOString());
    setTransportCost('');
    setNote('');
    setPurchaseItems([{}]);
  };

  const addPurchaseLine = () => setPurchaseItems([...purchaseItems, {}]);
  const removePurchaseLine = (index: number) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, key: string, value: any) => {
    const updatedItems = [...purchaseItems];
    updatedItems[index] = { ...updatedItems[index], [key]: value };
    
    if (key === 'itemId') {
      const selectedItem = allItemsMap.get(value);
      if(selectedItem) {
        updatedItems[index].type = selectedItem.type;
        updatedItems[index].itemName = selectedItem.name;
      }
    }
    setPurchaseItems(updatedItems);
  };
  
  const subtotal = useMemo(() => {
    return purchaseItems.reduce((sum, item) => {
      const itemCost = (item.quantity || 0) * (item.unitPrice || 0);
      return sum + itemCost;
    }, 0);
  }, [purchaseItems]);

  const handleAddPurchase = () => {
    // --- Validation ---
    const finalTransportCost = parseFloat(transportCost) || 0;
    
    const validItems = purchaseItems.filter(
      item => item.itemId && (item.quantity || 0) > 0 && (item.unitPrice || 0) >= 0
    ).map(item => ({...item, id: `p-item-${Date.now()}-${Math.random()}`} as PurchaseItem));

    if (validItems.length === 0) {
      toast({ variant: 'destructive', title: 'خطا', description: 'حداقل یک ردیف خرید معتبر وارد کنید.' });
      return;
    }

    const totalBaseCost = validItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // --- Logic ---
    const ingredientsToUpdate = new Map<string, Ingredient>();
    const productsToUpdate = new Map<string, Product>();

    for (const item of validItems) {
      const itemBaseCost = item.quantity * item.unitPrice;
      const transportShare = totalBaseCost > 0 ? (itemBaseCost / totalBaseCost) * finalTransportCost : 0;
      const finalUnitCost = item.unitPrice + (transportShare / item.quantity);
      
      if (item.type === 'ingredient') {
        const originalIngredient = ingredients.find(i => i.id === item.itemId.split('-')[1]);
        if (originalIngredient) {
          const oldStock = originalIngredient.stock;
          const oldAvg = originalIngredient.avgBuyPrice;
          const newQty = item.quantity;

          const newAvgPrice = oldStock + newQty > 0 
            ? ((oldStock * oldAvg) + (newQty * finalUnitCost)) / (oldStock + newQty)
            : finalUnitCost;
          
          const updatedIngredient = {
            ...originalIngredient,
            stock: oldStock + newQty,
            avgBuyPrice: newAvgPrice
          };
          ingredientsToUpdate.set(originalIngredient.id, updatedIngredient);
        }
      } else { // Product
        const originalProduct = products.find(p => p.id === item.itemId.split('-')[1]);
        if (originalProduct) {
           const oldStock = originalProduct.stock;
           const oldAvg = originalProduct.avgBuyPrice;
           const newQty = item.quantity;
           
           const newAvgPrice = oldStock + newQty > 0 
             ? ((oldStock * oldAvg) + (newQty * finalUnitCost)) / (oldStock + newQty)
             : finalUnitCost;

           const updatedProduct = {
             ...originalProduct,
             stock: oldStock + newQty,
             avgBuyPrice: newAvgPrice
           };
           productsToUpdate.set(originalProduct.id, updatedProduct);
        }
      }
    }
    
    // --- State Update ---
    const finalIngredients = ingredients.map(i => ingredientsToUpdate.get(i.id) || i);
    const finalProducts = products.map(p => productsToUpdate.get(p.id) || p);
    
    setIngredients(finalIngredients);
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(finalIngredients));
    setProducts(finalProducts);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(finalProducts));

    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      date: purchaseDate,
      items: validItems,
      transportCost: finalTransportCost,
      note: note,
    };
    
    const updatedPurchases = [...purchases, newPurchase];
    setPurchases(updatedPurchases);
    localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(updatedPurchases));

    toast({ title: 'موفقیت‌آمیز', description: 'خرید جدید با موفقیت ثبت و موجودی انبار به روز شد.' });

    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="خرید" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="ثبت خرید">
          <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsDialogOpen(isOpen); }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="ml-2 h-4 w-4" /> ثبت فاکتور خرید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>ثبت فاکتور خرید جدید</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">تاریخ فاکتور</Label>
                    <Input id="date" type="date" value={format(new Date(purchaseDate), 'yyyy-MM-dd')} onChange={(e) => setPurchaseDate(new Date(e.target.value).toISOString())} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transportCost">هزینه حمل و نقل (تومان)</Label>
                    <Input id="transportCost" type="number" value={transportCost} onChange={(e) => setTransportCost(e.target.value)} placeholder="0" />
                  </div>
                </div>

                <Separator className="my-4" />
                <Label className="font-bold">اقلام خریداری شده</Label>
                
                <div className="space-y-4">
                  {purchaseItems.map((item, index) => {
                     const selectedItem = allItemsMap.get(item.itemId || '');
                     const unitLabel = selectedItem && 'unit' in selectedItem ? unitLabels[selectedItem.unit] : 'عدد';

                    return (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md">
                          <div className="col-span-12 md:col-span-4 space-y-2">
                            <Label>نام کالا</Label>
                            <Select value={item.itemId} onValueChange={val => handleItemChange(index, 'itemId', val)}>
                              <SelectTrigger><SelectValue placeholder="انتخاب کالا..." /></SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                    <Label className='px-4 py-2 text-sm font-semibold'>محصولات</Label>
                                    {activeProducts.map(p => <SelectItem key={`product-${p.id}`} value={`product-${p.id}`}>{p.name}</SelectItem>)}
                                </SelectGroup>
                                <SelectGroup>
                                    <Label className='px-4 py-2 text-sm font-semibold'>مواد اولیه</Label>
                                    {activeIngredients.map(i => <SelectItem key={`ingredient-${i.id}`} value={`ingredient-${i.id}`}>{i.name}</SelectItem>)}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-6 md:col-span-3 space-y-2">
                            <Label>مقدار ({unitLabel})</Label>
                            <Input type="number" placeholder="0" value={item.quantity || ''} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))} />
                          </div>
                          <div className="col-span-6 md:col-span-4 space-y-2">
                            <Label>قیمت واحد (تومان)</Label>
                            <Input type="number" placeholder="0" value={item.unitPrice || ''} onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))} />
                          </div>
                          <div className="col-span-12 md:col-span-1 flex justify-end">
                            <Button variant="ghost" size="icon" onClick={() => removePurchaseLine(index)} disabled={purchaseItems.length === 1}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                    )
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={addPurchaseLine} className="mt-2">
                  <PlusCircle className="ml-2 h-4 w-4" /> افزودن ردیف
                </Button>

                <Separator className="my-4" />
                
                 <div className="space-y-2">
                    <Label htmlFor="note">یادداشت (اختیاری)</Label>
                    <Textarea id="note" value={note} onChange={e => setNote(e.target.value)} />
                </div>

                <div className='mt-4 p-4 bg-muted/50 rounded-lg space-y-2'>
                    <div className='flex justify-between items-center'>
                        <span className='text-muted-foreground'>جمع کل اقلام:</span>
                        <span className='font-semibold'>{Math.round(subtotal).toLocaleString('fa-IR')} تومان</span>
                    </div>
                     <div className='flex justify-between items-center'>
                        <span className='text-muted-foreground'>هزینه حمل:</span>
                        <span className='font-semibold'>{Math.round(parseFloat(transportCost) || 0).toLocaleString('fa-IR')} تومان</span>
                    </div>
                     <div className='flex justify-between items-center text-lg font-bold'>
                        <span className=''>مبلغ نهایی فاکتور:</span>
                        <span className='text-primary'>{Math.round(subtotal + (parseFloat(transportCost) || 0)).toLocaleString('fa-IR')} تومان</span>
                    </div>
                </div>

              </div>
              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>لغو</Button>
                <Button type="submit" onClick={handleAddPurchase}>ثبت فاکتور</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        
        <Card>
          <CardHeader>
            <CardTitle>تاریخچه خرید</CardTitle>
            <CardDescription>لیست تمام فاکتورهای خرید ثبت شده.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>اقلام</TableHead>
                  <TableHead>هزینه حمل</TableHead>
                  <TableHead>مبلغ نهایی</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length > 0 ? (
                  [...purchases].reverse().map(pur => {
                    const totalValue = (pur.items || []).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) + (pur.transportCost || 0);
                    return (
                        <TableRow key={pur.id}>
                            <TableCell>{formatJalali(new Date(pur.date), 'yyyy/MM/dd')}</TableCell>
                            <TableCell>{(pur.items || []).map(i => i.itemName).join('، ')}</TableCell>
                            <TableCell>{(pur.transportCost || 0).toLocaleString('fa-IR')} تومان</TableCell>
                            <TableCell className="font-semibold">{Math.round(totalValue).toLocaleString('fa-IR')} تومان</TableCell>
                        </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      خریدی ثبت نشده است.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
