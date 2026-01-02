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
  wasteRecord: Waste | null;
};

const initialDialogState: DialogState = {
  isOpen: false,
  mode: 'add',
  wasteRecord: null,
};

const initialFormState = {
    itemId: '',
    quantity: '',
    reason: '',
    date: formatDate(new Date(), 'yyyy-MM-dd'),
};

export default function WastePage() {
  const { ingredients, products, waste } = useAppData();
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<DialogState>(initialDialogState);
  const [formData, setFormData] = useState(initialFormState);
  const [isClient, setIsClient] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const allItemsMap = useMemo(() => {
    const map = new Map<string, (Product | Ingredient) & { type: 'product' | 'ingredient' }>();
    ingredients.forEach(i => map.set(`ingredient-${i.id}`, { ...i, type: 'ingredient' }));
    products.forEach(p => map.set(`product-${p.id}`, { ...p, type: 'product' }));
    return map;
  }, [ingredients, products]);

  const selectedItem = useMemo(() => allItemsMap.get(formData.itemId), [formData.itemId, allItemsMap]);

  const openDialog = (mode: 'add' | 'edit', wasteRecord: Waste | null = null) => {
    if (mode === 'edit' && wasteRecord) {
      setFormData({
        itemId: `${wasteRecord.itemType}-${wasteRecord.itemId}`,
        quantity: String(wasteRecord.quantity),
        reason: wasteRecord.reason,
        date: formatDate(new Date(wasteRecord.date), 'yyyy-MM-dd'),
      });
    } else {
      setFormData(initialFormState);
    }
    setDialogState({ isOpen: true, mode, wasteRecord });
  };

  const closeDialog = () => {
    setDialogState(initialDialogState);
    setFormData(initialFormState);
  };
  
  const handleSave = () => {
    if (!selectedItem || !formData.quantity) {
        toast({ variant: 'destructive', title: 'خطا', description: 'لطفاً کالا و مقدار را مشخص کنید.' });
        return;
    }
    
    const quantity = parseFloat(formData.quantity);
    if (quantity <= 0) {
        toast({ variant: 'destructive', title: 'خطا', description: 'مقدار باید بزرگتر از صفر باشد.' });
        return;
    }

    if (dialogState.mode === 'add') {
      if (selectedItem.stock < quantity) {
          toast({ variant: 'destructive', title: 'موجودی ناکافی', description: `موجودی "${selectedItem.name}" کافی نیست.` });
          return;
      }
      
      const newWasteRecord: Waste = {
        id: `waste-${Date.now()}`,
        date: new Date(formData.date).toISOString(),
        itemType: selectedItem.type,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        quantity,
        unit: selectedItem.type === 'product' ? 'عدد' : unitLabels[selectedItem.unit],
        cost: quantity * selectedItem.avgBuyPrice,
        reason: formData.reason,
      };

      const updatedStockItems = selectedItem.type === 'product'
        ? { products: products.map(p => p.id === selectedItem.id ? { ...p, stock: p.stock - quantity } : p) }
        : { ingredients: ingredients.map(i => i.id === selectedItem.id ? { ...i, stock: i.stock - quantity } : i) };

      dataStore.saveData({
        ...updatedStockItems,
        waste: [...waste, newWasteRecord],
      });

      toast({ title: 'موفقیت‌آمیز', description: 'ضایعات با موفقیت ثبت شد.' });
    } else if (dialogState.mode === 'edit' && dialogState.wasteRecord) {
        const originalRecord = dialogState.wasteRecord;
        const originalItem = allItemsMap.get(`${originalRecord.itemType}-${originalRecord.itemId}`);

        // This edit logic assumes the item itself (itemId) does not change.
        if (!originalItem || !selectedItem || originalItem.id !== selectedItem.id) {
            toast({ variant: 'destructive', title: 'خطا', description: 'تغییر نوع کالا در حالت ویرایش امکان‌پذیر نیست.' });
            return;
        }

        const stockChange = quantity - originalRecord.quantity;

        if (selectedItem.stock < stockChange) {
            toast({ variant: 'destructive', title: 'موجودی ناکافی', description: `موجودی برای این تغییر کافی نیست.` });
            return;
        }
        
        const updatedRecord: Waste = {
            ...originalRecord,
            date: new Date(formData.date).toISOString(),
            quantity,
            cost: quantity * selectedItem.avgBuyPrice,
            reason: formData.reason,
        };

        const updatedStockItems = selectedItem.type === 'product'
            ? { products: products.map(p => p.id === selectedItem.id ? { ...p, stock: p.stock - stockChange } : p) }
            : { ingredients: ingredients.map(i => i.id === selectedItem.id ? { ...i, stock: i.stock - stockChange } : i) };
        
        dataStore.saveData({
            ...updatedStockItems,
            waste: waste.map(w => w.id === updatedRecord.id ? updatedRecord : w),
        });
        toast({ title: 'موفقیت‌آمیز', description: 'رکورد ضایعات ویرایش شد.' });
    }

    closeDialog();
  };

  const handleDelete = (wasteId: string) => {
    const recordToDelete = waste.find(w => w.id === wasteId);
    if (!recordToDelete) return;

    const itemToRestore = allItemsMap.get(`${recordToDelete.itemType}-${recordToDelete.itemId}`);
    if (!itemToRestore) {
        // Item might have been deleted, proceed with removing waste record anyway
        console.warn(`Item for waste record ${wasteId} not found. Deleting record without restoring stock.`);
         dataStore.saveData({ waste: waste.filter(w => w.id !== wasteId) });
         toast({ title: 'رکورد ضایعات حذف شد', description: 'کالای اصلی یافت نشد، بنابراین موجودی تغییری نکرد.' });
         return;
    }

    const updatedStockItems = itemToRestore.type === 'product'
        ? { products: products.map(p => p.id === itemToRestore.id ? { ...p, stock: p.stock + recordToDelete.quantity } : p) }
        : { ingredients: ingredients.map(i => i.id === itemToRestore.id ? { ...i, stock: i.stock + recordToDelete.quantity } : i) };
    
    dataStore.saveData({
        ...updatedStockItems,
        waste: waste.filter(w => w.id !== wasteId),
    });

    toast({ title: 'موفقیت‌آمیز', description: 'رکورد ضایعات حذف و موجودی به انبار بازگردانده شد.' });
  };
  
  const sortedWaste = useMemo(() => {
    return [...waste].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [waste]);

  const renderSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Table><TableHeader><TableRow>{[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-6 w-full" /></TableHead>)}</TableRow></TableHeader>
          <TableBody>{[...Array(3)].map((_, i) => (<TableRow key={i}>{[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>)}</TableRow>))}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="ضایعات" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="مدیریت ضایعات">
          <Button onClick={() => openDialog('add')}><PlusCircle className="ml-2 h-4 w-4" /> ثبت ضایعات</Button>
        </PageHeader>
        
        {!isClient ? renderSkeleton() : (
            <Card>
                <CardHeader>
                    <CardTitle>تاریخچه ضایعات</CardTitle>
                    <CardDescription>لیست تمام موارد ثبت شده به عنوان ضایعات.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>تاریخ</TableHead>
                                <TableHead>نام کالا</TableHead>
                                <TableHead>مقدار</TableHead>
                                <TableHead>هزینه</TableHead>
                                <TableHead>دلیل</TableHead>
                                <TableHead><span className="sr-only">عملیات</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedWaste.length > 0 ? sortedWaste.map(record => (
                                <TableRow key={record.id}>
                                    <TableCell>{formatJalali(new Date(record.date), 'yyyy/MM/dd')}</TableCell>
                                    <TableCell>{record.itemName}</TableCell>
                                    <TableCell>{record.quantity.toLocaleString('fa-IR')} {record.unit}</TableCell>
                                    <TableCell>{record.cost.toLocaleString('fa-IR')} تومان</TableCell>
                                    <TableCell>{record.reason || '-'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu open={openMenuId === record.id} onOpenChange={(isOpen) => setOpenMenuId(isOpen ? record.id : null)}>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openDialog('edit', record)}><Pencil className="ml-2 h-4 w-4" /> ویرایش</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-destructive focus:text-destructive"><Trash2 className="ml-2 h-4 w-4" /> حذف</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">هیچ ضایعاتی ثبت نشده است.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                 <CardFooter>
                    <div className="text-xs text-muted-foreground">
                        نمایش <strong>{sortedWaste.length}</strong> رکورد
                    </div>
                </CardFooter>
            </Card>
        )}

        <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{dialogState.mode === 'add' ? 'ثبت ضایعات جدید' : 'ویرایش رکورد ضایعات'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="item">کالا</Label>
                        <Select value={formData.itemId} onValueChange={(val) => setFormData(f => ({...f, itemId: val}))} disabled={dialogState.mode === 'edit'}>
                            <SelectTrigger id="item"><SelectValue placeholder="انتخاب کالا..." /></SelectTrigger>
                            <SelectContent position="popper">
                                <SelectGroup><Label className='px-4 py-2 text-sm font-semibold'>محصولات</Label>
                                    {products.filter(p => p.status === 'active').map(p => <SelectItem key={`product-${p.id}`} value={`product-${p.id}`}>{p.name}</SelectItem>)}
                                </SelectGroup>
                                <SelectGroup><Label className='px-4 py-2 text-sm font-semibold'>مواد اولیه</Label>
                                    {ingredients.filter(i => i.status === 'active').map(i => <SelectItem key={`ingredient-${i.id}`} value={`ingredient-${i.id}`}>{i.name}</SelectItem>)}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                         {selectedItem && (
                            <p className="text-xs text-muted-foreground">
                                موجودی فعلی: {selectedItem.stock.toLocaleString('fa-IR')} {selectedItem.type === 'product' ? 'عدد' : unitLabels[selectedItem.unit]}
                            </p>
                         )}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="quantity">مقدار</Label>
                        <Input id="quantity" type="number" value={formData.quantity} onChange={(e) => setFormData(f => ({...f, quantity: e.target.value }))} />
                         {selectedItem && (
                            <p className="text-xs text-muted-foreground">
                                هزینه تخمینی این مقدار: {((parseFloat(formData.quantity) || 0) * selectedItem.avgBuyPrice).toLocaleString('fa-IR')} تومان
                            </p>
                         )}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="date">تاریخ</Label>
                        <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData(f => ({...f, date: e.target.value }))} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="reason">دلیل (اختیاری)</Label>
                        <Textarea id="reason" value={formData.reason} onChange={(e) => setFormData(f => ({...f, reason: e.target.value }))} placeholder="مثال: انقضا، خرابی، ..."/>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={closeDialog}>لغو</Button>
                    <Button type="submit" onClick={handleSave}>ثبت</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
