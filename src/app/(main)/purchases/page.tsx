'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlusCircle, ShoppingCart } from 'lucide-react';
import {
  format,
} from 'date-fns';
import { format as formatJalali } from 'date-fns-jalali';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { type Ingredient, type Purchase, unitLabels } from '@/lib/types';
import { ingredients as initialIngredients, purchases as initialPurchases } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INGREDIENTS_STORAGE_KEY = 'gym-canteen-ingredients';
const PURCHASES_STORAGE_KEY = 'gym-canteen-purchases';

export default function PurchasesPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPurchase, setNewPurchase] = useState({
    ingredientId: '',
    quantity: '',
    purchasePrice: '',
    date: new Date().toISOString(),
  });
  const { toast } = useToast();

  useEffect(() => {
    const storedIngredients = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
    setIngredients(storedIngredients ? JSON.parse(storedIngredients) : initialIngredients);
    
    const storedPurchases = localStorage.getItem(PURCHASES_STORAGE_KEY);
    setPurchases(storedPurchases ? JSON.parse(storedPurchases) : initialPurchases);
  }, []);

  const ingredientMap = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients]);

  const handleAddPurchase = () => {
    const { ingredientId, quantity, purchasePrice, date } = newPurchase;
    if (!ingredientId || !quantity || !purchasePrice || parseFloat(quantity) <= 0 || parseFloat(purchasePrice) <= 0) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'لطفاً تمام فیلدها را با مقادیر معتبر پر کنید.',
      });
      return;
    }

    const selectedIngredient = ingredientMap.get(ingredientId);
    if (!selectedIngredient) return;

    const qty = parseFloat(quantity);
    const price = parseFloat(purchasePrice);

    // Update ingredient stock and average buy price
    const updatedIngredients = ingredients.map(ing => {
      if (ing.id === ingredientId) {
        const currentTotalValue = ing.avgBuyPrice * ing.stock;
        const newTotalStock = ing.stock + qty;
        const newPurchaseValue = price; // The total price for the new quantity
        const newTotalValue = currentTotalValue + newPurchaseValue;
        const newAvgPrice = newTotalStock > 0 ? newTotalValue / newTotalStock : 0;
        return { ...ing, stock: newTotalStock, avgBuyPrice: newAvgPrice };
      }
      return ing;
    });
    
    setIngredients(updatedIngredients);
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(updatedIngredients));

    // Add to purchases history
    const purchaseData: Purchase = {
      id: `pur-${Date.now()}`,
      ingredientId,
      quantity: qty,
      purchasePrice: price,
      date,
    };
    
    const updatedPurchases = [...purchases, purchaseData];
    setPurchases(updatedPurchases);
    localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(updatedPurchases));

    toast({
      title: 'موفقیت‌آمیز',
      description: `خرید ${qty} ${unitLabels[selectedIngredient.unit]} از ${selectedIngredient.name} ثبت شد.`,
    });

    setIsDialogOpen(false);
    setNewPurchase({ ingredientId: '', quantity: '', purchasePrice: '', date: new Date().toISOString() });
  };
  
  const selectedIngredientForDialog = ingredientMap.get(newPurchase.ingredientId);

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="خرید" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="ثبت خرید مواد اولیه">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="ml-2 h-4 w-4" /> ثبت خرید
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>ثبت خرید جدید</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="ingredient" className="text-right">ماده اولیه</Label>
                  <Select value={newPurchase.ingredientId} onValueChange={val => setNewPurchase({...newPurchase, ingredientId: val})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="انتخاب ماده اولیه" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map(ing => (
                        <SelectItem key={ing.id} value={ing.id}>{ing.name} {ing.variantName ? `(${ing.variantName})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">
                    مقدار {selectedIngredientForDialog ? `(${unitLabels[selectedIngredientForDialog.unit]})` : ''}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newPurchase.quantity}
                    onChange={(e) => setNewPurchase({ ...newPurchase, quantity: e.target.value })}
                    className="col-span-3"
                    disabled={!newPurchase.ingredientId}
                    placeholder="مثال: 2.5"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    مبلغ کل خرید (تومان)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={newPurchase.purchasePrice}
                    onChange={(e) => setNewPurchase({ ...newPurchase, purchasePrice: e.target.value })}
                    className="col-span-3"
                    disabled={!newPurchase.ingredientId}
                    placeholder="مثال: 250000"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    تاریخ
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={format(new Date(newPurchase.date), 'yyyy-MM-dd')}
                    onChange={(e) => setNewPurchase({ ...newPurchase, date: new Date(e.target.value).toISOString() })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>
                  لغو
                </Button>
                <Button type="submit" onClick={handleAddPurchase} disabled={!newPurchase.ingredientId || !newPurchase.quantity || !newPurchase.purchasePrice}>
                  ثبت
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        
        <Card>
            <CardHeader>
                <CardTitle>تاریخچه خرید</CardTitle>
                <CardDescription>لیست تمام خریدهای ثبت شده برای مواد اولیه.</CardDescription>
            </CardHeader>
            <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ماده اولیه</TableHead>
                  <TableHead>مقدار</TableHead>
                  <TableHead>مبلغ کل</TableHead>
                  <TableHead>تاریخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length > 0 ? (
                  [...purchases].reverse().map(pur => {
                    const ingredient = ingredientMap.get(pur.ingredientId);
                    return (
                        <TableRow key={pur.id}>
                            <TableCell>{ingredient ? `${ingredient.name} ${ingredient.variantName ? `(${ingredient.variantName})` : ''}` : 'حذف شده'}</TableCell>
                            <TableCell>{pur.quantity.toLocaleString('fa-IR')} {ingredient ? unitLabels[ingredient.unit] : ''}</TableCell>
                            <TableCell>{pur.purchasePrice.toLocaleString('fa-IR')} تومان</TableCell>
                            <TableCell>{formatJalali(new Date(pur.date), 'yyyy/MM/dd')}</TableCell>
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
