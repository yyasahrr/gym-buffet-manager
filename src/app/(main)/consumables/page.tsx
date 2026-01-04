'use client';

import { useState, useMemo, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { format as formatJalali } from 'date-fns-jalali';
import { format as formatDate } from 'date-fns';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { type Ingredient, type Product, type Waste, unitLabels } from '@/lib/types';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData, dataStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type DialogState = {
  isOpen: boolean;
  mode: 'add' | 'edit';
  consumableRecord: Waste | null; // Using Waste type for simplicity
};

const initialDialogState: DialogState = {
  isOpen: false,
  mode: 'add',
  consumableRecord: null,
};

const initialFormState = {
    itemId: '',
    quantity: '',
    reason: '',
    date: formatDate(new Date(), 'yyyy-MM-dd'),
};

export default function ConsumablesPage() {
  const { ingredients, products, waste } = useAppData(); // Using waste for consumables data
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<DialogState>(initialDialogState);
  const [formData, setFormData] = useState(initialFormState);
  const [isClient, setIsClient] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const activeIngredients = useMemo(() => ingredients.filter(i => i.status === 'active'), [ingredients]);
  const activeProducts = useMemo(() => products.filter(p => p.status === 'active'), [products]);

  const allItemsMap = useMemo(() => {
    const map = new Map<string, (Product | Ingredient) & { type: 'product' | 'ingredient' }>();
    activeIngredients.forEach(i => map.set(`ingredient-${i.id}`, { ...i, type: 'ingredient' }));
    activeProducts.forEach(p => map.set(`product-${p.id}`, { ...p, type: 'product' }));
    return map;
  }, [activeIngredients, activeProducts]);

  const filteredConsumables = useMemo(() => {
    return waste.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [waste]);

  const resetForm = () => {
    setFormData(initialFormState);
  };

  const openDialog = (mode: 'add' | 'edit', consumableRecord: Waste | null = null) => {
    if (mode === 'edit' && consumableRecord) {
      setFormData({
        itemId: `${consumableRecord.itemType}-${consumableRecord.itemId}`,
        quantity: String(consumableRecord.quantity),
        reason: consumableRecord.reason,
        date: formatDate(new Date(consumableRecord.date), 'yyyy-MM-dd'),
      });
    } else {
      resetForm();
    }
    setDialogState({ isOpen: true, mode, consumableRecord });
  };

  const closeDialog = () => {
    setDialogState(initialDialogState);
    resetForm();
  };

  const handleSaveConsumable = () => {
    const { itemId, quantity, reason, date } = formData;
    if (!itemId || !quantity || parseFloat(quantity) <= 0) {
      toast({ variant: 'destructive', title: 'خطا', description: 'لطفاً آیتم، مقدار و دلیل را وارد کنید.' });
      return;
    }

    const selectedItem = allItemsMap.get(itemId);
    if (!selectedItem) {
      toast({ variant: 'destructive', title: 'خطا', description: 'آیتم انتخاب شده معتبر نیست.' });
      return;
    }

    const qty = parseFloat(quantity);
    if (selectedItem.stock < qty) {
      toast({ variant: 'destructive', title: 'خطا', description: 'مقدار مصرفی نمی‌تواند بیشتر از موجودی باشد.' });
      return;
    }

    const cost = qty * selectedItem.avgBuyPrice;

    if (dialogState.mode === 'add') {
      const newConsumable: Waste = {
        id: `consumable-${Date.now()}`,
        date: new Date(date).toISOString(),
        itemType: selectedItem.type,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        quantity: qty,
        unit: selectedItem.unit || 'عدد',
        cost: cost,
        reason: reason,
      };

      const updatedWaste = [...waste, newConsumable];
      const updatedStockItems = selectedItem.type === 'product'
        ? { products: products.map(p => p.id === selectedItem.id ? { ...p, stock: p.stock - qty } : p) }
        : { ingredients: ingredients.map(i => i.id === selectedItem.id ? { ...i, stock: i.stock - qty } : i) };

      dataStore.saveData({ waste: updatedWaste, ...updatedStockItems });

      toast({ title: 'موفق', description: 'مصرفی جدید ثبت شد و موجودی کاهش یافت.' });
    } else if (dialogState.mode === 'edit' && dialogState.consumableRecord) {
      // For edit, reverse old and apply new
      const oldRecord = dialogState.consumableRecord;
      const stockChange = qty - oldRecord.quantity;

      if (selectedItem.stock < stockChange) {
        toast({ variant: 'destructive', title: 'خطا', description: 'مقدار جدید مصرفی نمی‌تواند بیشتر از موجودی باشد.' });
        return;
      }

      const updatedWaste = waste.map(w => w.id === oldRecord.id ? {
        ...w,
        date: new Date(date).toISOString(),
        itemType: selectedItem.type,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        quantity: qty,
        unit: selectedItem.unit || 'عدد',
        cost: cost,
        reason: reason,
      } : w);

      const updatedStockItems = selectedItem.type === 'product'
        ? { products: products.map(p => p.id === selectedItem.id ? { ...p, stock: p.stock - stockChange } : p) }
        : { ingredients: ingredients.map(i => i.id === selectedItem.id ? { ...i, stock: i.stock - stockChange } : i) };

      dataStore.saveData({ waste: updatedWaste, ...updatedStockItems });

      toast({ title: 'موفق', description: 'مصرفی ویرایش شد.' });
    }

    closeDialog();
  };

  const handleDeleteConsumable = (id: string) => {
    const recordToDelete = waste.find(w => w.id === id);
    if (!recordToDelete) return;

    // Restore stock
    const updatedStockItems = recordToDelete.itemType === 'product'
      ? { products: products.map(p => p.id === recordToDelete.itemId ? { ...p, stock: p.stock + recordToDelete.quantity } : p) }
      : { ingredients: ingredients.map(i => i.id === recordToDelete.itemId ? { ...i, stock: i.stock + recordToDelete.quantity } : i) };

    const updatedWaste = waste.filter(w => w.id !== id);
    dataStore.saveData({ waste: updatedWaste, ...updatedStockItems });

    toast({ title: 'حذف شد', description: 'مصرفی حذف شد و موجودی بازگردانده شد.' });
    setOpenMenuId(null);
  };

  const renderTable = () => (
    <Card>
      <CardHeader>
        <CardTitle>مصرفی‌های ثبت شده</CardTitle>
        <CardDescription>لیست آیتم‌های مصرفی جانبی مثل سس و غیره.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>تاریخ</TableHead>
              <TableHead>آیتم</TableHead>
              <TableHead>مقدار</TableHead>
              <TableHead>هزینه</TableHead>
              <TableHead>دلیل</TableHead>
              <TableHead>
                <span className="sr-only">عملیات</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isClient && filteredConsumables.map(record => (
              <TableRow key={record.id}>
                <TableCell>{formatJalali(new Date(record.date), 'yyyy/MM/dd')}</TableCell>
                <TableCell>{record.itemName}</TableCell>
                <TableCell>{record.quantity} {record.unit}</TableCell>
                <TableCell>{record.cost.toLocaleString('fa-IR')} تومان</TableCell>
                <TableCell>{record.reason}</TableCell>
                <TableCell>
                  <DropdownMenu open={openMenuId === record.id} onOpenChange={(isOpen) => setOpenMenuId(isOpen ? record.id : null)}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">باز کردن منو</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog('edit', record)}>
                        <Pencil className="ml-2 h-4 w-4" />
                        ویرایش
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteConsumable(record.id)} className="text-destructive">
                        <Trash2 className="ml-2 h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          نمایش <strong>{filteredConsumables.length}</strong> مصرفی
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      <Header onSearch={() => {}} breadcrumbs={[]} activeBreadcrumb="مصرفی‌ها" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="مصرفی‌ها">
          <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog('add')}>
                <PlusCircle className="ml-2 h-4 w-4" /> افزودن مصرفی
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{dialogState.mode === 'add' ? 'افزودن مصرفی جدید' : 'ویرایش مصرفی'}</DialogTitle>
                <DialogDescription>آیتم‌های مصرفی جانبی مثل سس و غیره را ثبت کنید.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="item" className="text-right">آیتم</Label>
                  <Select value={formData.itemId} onValueChange={(value) => setFormData({ ...formData, itemId: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="انتخاب آیتم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <optgroup label="مواد اولیه">
                          {activeIngredients.map(ing => (
                            <SelectItem key={`ingredient-${ing.id}`} value={`ingredient-${ing.id}`}>
                              {ing.name} (موجودی: {ing.stock} {unitLabels[ing.unit] || ''})
                            </SelectItem>
                          ))}
                        </optgroup>
                        <optgroup label="محصولات">
                          {activeProducts.map(prod => (
                            <SelectItem key={`product-${prod.id}`} value={`product-${prod.id}`}>
                              {prod.name} (موجودی: {prod.stock})
                            </SelectItem>
                          ))}
                        </optgroup>
                      </SelectContent>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="quantity" className="text-right">مقدار</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="col-span-3"
                    placeholder="مثال: 5"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reason" className="text-right">دلیل</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="col-span-3"
                    placeholder="مثال: مصرف کنار غذا"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">تاریخ</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={closeDialog}>لغو</Button>
                <Button type="submit" onClick={handleSaveConsumable}>ذخیره</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        {renderTable()}
      </main>
    </div>
  );
}