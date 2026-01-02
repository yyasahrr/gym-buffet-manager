'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
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
import { type Ingredient, type Purchase, unitLabels, type Unit } from '@/lib/types';
import { ingredients as initialIngredients, purchases as initialPurchases } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const INGREDIENTS_STORAGE_KEY = 'gym-canteen-ingredients';
const PURCHASES_STORAGE_KEY = 'gym-canteen-purchases';

const packagingTypes = [
    "بسته", "شیشه", "قوطی", "کارتن", "شانه", "کیسه"
];

export default function PurchasesPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<'direct' | 'package'>('direct');

  // State for direct entry
  const [directQuantity, setDirectQuantity] = useState('');

  // State for package entry
  const [packageCount, setPackageCount] = useState('');
  const [packageSize, setPackageSize] = useState('');
  const [packagingType, setPackagingType] = useState('');


  const [newPurchase, setNewPurchase] = useState({
    ingredientId: '',
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

  const activeIngredients = useMemo(() => ingredients.filter(i => i.status === 'active'), [ingredients]);
  const ingredientMap = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients]);

  const resetForm = () => {
    setNewPurchase({ ingredientId: '', purchasePrice: '', date: new Date().toISOString() });
    setDirectQuantity('');
    setPackageCount('');
    setPackageSize('');
    setPackagingType('');
    setEntryMode('direct');
  }

  const computedQuantity = useMemo(() => {
    if (entryMode === 'package') {
        const count = parseFloat(packageCount);
        const size = parseFloat(packageSize);
        if (!isNaN(count) && !isNaN(size) && count > 0 && size > 0) {
            return count * size;
        }
    }
    return parseFloat(directQuantity) || 0;
  }, [entryMode, directQuantity, packageCount, packageSize]);


  const handleAddPurchase = () => {
    const { ingredientId, purchasePrice, date } = newPurchase;
    
    if (!ingredientId || !computedQuantity || !purchasePrice || computedQuantity <= 0 || parseFloat(purchasePrice) <= 0) {
      toast({
        variant: 'destructive',
        title: 'خطا',
        description: 'لطفاً تمام فیلدها را با مقادیر معتبر پر کنید.',
      });
      return;
    }

    const selectedIngredient = ingredientMap.get(ingredientId);
    if (!selectedIngredient) return;

    const qty = computedQuantity;
    const price = parseFloat(purchasePrice);

    // Update ingredient stock and average buy price
    const updatedIngredients = ingredients.map(ing => {
      if (ing.id === ingredientId) {
        const currentTotalValue = ing.avgBuyPrice * ing.stock;
        const newTotalStock = ing.stock + qty;
        
        const newPurchaseValue = price; 
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
      description: `خرید ${qty.toLocaleString('fa-IR')} ${unitLabels[selectedIngredient.unit]} از ${selectedIngredient.name} ثبت شد.`,
    });

    setIsDialogOpen(false);
    resetForm();
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
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>ثبت خرید جدید</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ingredient">ماده اولیه</Label>
                  <Select value={newPurchase.ingredientId} onValueChange={val => setNewPurchase({...newPurchase, ingredientId: val})}>
                    <SelectTrigger id="ingredient">
                      <SelectValue placeholder="انتخاب ماده اولیه" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeIngredients.map(ing => (
                        <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Tabs value={entryMode} onValueChange={(value) => setEntryMode(value as 'direct' | 'package')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="direct" disabled={!selectedIngredientForDialog}>ورود مستقیم</TabsTrigger>
                        <TabsTrigger value="package" disabled={!selectedIngredientForDialog}>بر اساس بسته</TabsTrigger>
                    </TabsList>
                    <TabsContent value="direct" className="space-y-2 pt-2">
                        <Label htmlFor="quantity">
                            {selectedIngredientForDialog
                                ? `مقدار (${unitLabels[selectedIngredientForDialog.unit]})`
                                : 'مقدار'
                            }
                        </Label>
                        <Input
                            id="quantity"
                            type="number"
                            value={directQuantity}
                            onChange={(e) => setDirectQuantity(e.target.value)}
                            disabled={!newPurchase.ingredientId}
                            placeholder="مثال: 2.5"
                        />
                    </TabsContent>
                    <TabsContent value="package" className="space-y-4 pt-2">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="packageCount">تعداد بسته</Label>
                                <Input id="packageCount" type="number" value={packageCount} onChange={e => setPackageCount(e.target.value)} placeholder="مثال: 3"/>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="packageSize">
                                    {selectedIngredientForDialog
                                        ? `مقدار در هر بسته (${unitLabels[selectedIngredientForDialog.unit]})`
                                        : 'مقدار در هر بسته'
                                    }
                                 </Label>
                                <Input id="packageSize" type="number" value={packageSize} onChange={e => setPackageSize(e.target.value)} placeholder="مثال: 5"/>
                            </div>
                         </div>
                         <div>
                            <p className="text-sm text-muted-foreground">
                                مقدار کل محاسبه شده: <span className="font-bold text-primary">{computedQuantity.toLocaleString('fa-IR')} {selectedIngredientForDialog ? unitLabels[selectedIngredientForDialog.unit] : ''}</span>
                            </p>
                         </div>
                    </TabsContent>
                </Tabs>


                <div className="space-y-2">
                  <Label htmlFor="price">
                    مبلغ کل خرید (تومان)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={newPurchase.purchasePrice}
                    onChange={(e) => setNewPurchase({ ...newPurchase, purchasePrice: e.target.value })}
                    className=""
                    disabled={!newPurchase.ingredientId}
                    placeholder="مثال: 250000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">
                    تاریخ
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={format(new Date(newPurchase.date), 'yyyy-MM-dd')}
                    onChange={(e) => setNewPurchase({ ...newPurchase, date: new Date(e.target.value).toISOString() })}
                    className=""
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => { setIsDialogOpen(false); resetForm();}}>
                  لغو
                </Button>
                <Button type="submit" onClick={handleAddPurchase} disabled={!newPurchase.ingredientId || !computedQuantity || !newPurchase.purchasePrice}>
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
                            <TableCell>{ingredient ? ingredient.name : 'حذف شده'}</TableCell>
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
