'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Trash2, MoreHorizontal, Pencil, Archive, ArchiveRestore } from 'lucide-react';
import { format } from 'date-fns';
import { format as formatJalali, parse as parseJalali } from 'date-fns-jalali';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { type Ingredient, type Product, type Purchase, type PurchaseItem, unitLabels } from '@/lib/types';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAppData, dataStore } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';


type DialogState = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    purchase: Purchase | null;
}

const initialDialogState: DialogState = {
    isOpen: false,
    mode: 'add',
    purchase: null
};

export default function PurchasesPage() {
  const { ingredients, products, purchases } = useAppData();
  const [dialogState, setDialogState] = useState<DialogState>(initialDialogState);
  
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString());
  const [transportCost, setTransportCost] = useState('');
  const [note, setNote] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<Partial<PurchaseItem>[]>([{}]);
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

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

  const filteredPurchases = useMemo(() => {
      return purchases.filter(p => (p.status || 'active') === activeTab)
                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, activeTab]);

  const resetForm = () => {
    setPurchaseDate(new Date().toISOString());
    setTransportCost('');
    setNote('');
    setPurchaseItems([{}]);
  };

  const openDialog = (mode: 'add' | 'edit', purchase: Purchase | null = null) => {
      if (mode === 'edit' && purchase) {
          setPurchaseDate(purchase.date);
          setTransportCost(String(purchase.transportCost));
          setNote(purchase.note);
          setPurchaseItems(purchase.items);
      } else {
          resetForm();
      }
      setDialogState({ isOpen: true, mode, purchase });
  };

  const closeDialog = () => {
    setDialogState(initialDialogState);
    resetForm();
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
      } else {
        updatedItems[index].type = undefined;
        updatedItems[index].itemName = '';
      }
    }
    setPurchaseItems(updatedItems);
  };
  
  const subtotal = useMemo(() => {
    return purchaseItems.reduce((sum, item) => {
      return sum + (item.lineTotalCost || 0);
    }, 0);
  }, [purchaseItems]);

  const handleSavePurchase = () => {
    if (dialogState.mode === 'edit') {
        // Logic for editing an existing purchase
        handleEditPurchase();
    } else {
        // Logic for adding a new purchase
        handleAddPurchase();
    }
  };

  const handleAddPurchase = () => {
    // --- Validation ---
    const finalTransportCost = parseFloat(transportCost) || 0;
    if (finalTransportCost < 0) {
        toast({ variant: 'destructive', title: 'خطا', description: 'هزینه حمل و نقل نمی‌تواند منفی باشد.' });
        return;
    }
    
    const validItems = purchaseItems.filter(
      item => item.itemId && item.type && (item.quantity || 0) > 0 && (item.lineTotalCost || 0) > 0
    ).map(item => ({
        ...item,
        id: `p-item-${Date.now()}-${Math.random()}`
    } as PurchaseItem));

    if (validItems.length === 0) {
      toast({ variant: 'destructive', title: 'خطا', description: 'حداقل یک ردیف خرید معتبر با مقدار و مبلغ کل مثبت وارد کنید.' });
      return;
    }

    const totalBaseCost = validItems.reduce((sum, item) => sum + item.lineTotalCost, 0);

    // --- Logic ---
    let tempIngredients = ingredients.map(i => ({...i}));
    let tempProducts = products.map(p => ({...p}));

    for (const item of validItems) {
      const itemBaseCost = item.lineTotalCost;
      const transportShare = totalBaseCost > 0 ? (itemBaseCost / totalBaseCost) * finalTransportCost : 0;
      const finalUnitCost = (itemBaseCost + transportShare) / item.quantity;
      
      if (item.type === 'ingredient') {
        const itemId = item.itemId.split('-').slice(1).join('-');
        const originalIngredientIndex = tempIngredients.findIndex(i => i.id === itemId);
        if (originalIngredientIndex !== -1) {
          const originalIngredient = tempIngredients[originalIngredientIndex];
          const oldStock = originalIngredient.stock;
          const oldAvg = originalIngredient.avgBuyPrice;
          const newQty = item.quantity;

          const newAvgPrice = oldStock + newQty > 0 
            ? ((oldStock * oldAvg) + (newQty * finalUnitCost)) / (oldStock + newQty)
            : finalUnitCost;
          
          originalIngredient.stock = oldStock + newQty;
          originalIngredient.avgBuyPrice = newAvgPrice;
        }
      } else { // Product
        const itemId = item.itemId.split('-').slice(1).join('-');
        const originalProductIndex = tempProducts.findIndex(p => p.id === itemId);
        if (originalProductIndex !== -1) {
           const originalProduct = tempProducts[originalProductIndex];
           const oldStock = originalProduct.stock;
           const oldAvg = originalProduct.avgBuyPrice;
           const newQty = item.quantity;
           
           const newAvgPrice = oldStock + newQty > 0 
             ? ((oldStock * oldAvg) + (newQty * finalUnitCost)) / (oldStock + newQty)
             : finalUnitCost;

           originalProduct.stock = oldStock + newQty;
           originalProduct.avgBuyPrice = newAvgPrice;
        }
      }
    }
    
    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      date: purchaseDate,
      items: validItems,
      transportCost: finalTransportCost,
      note: note,
      status: 'active',
    };
    
    dataStore.saveData({ 
        ingredients: tempIngredients, 
        products: tempProducts, 
        purchases: [...purchases, newPurchase]
    });

    toast({ title: 'موفقیت‌آمیز', description: 'خرید جدید با موفقیت ثبت و موجودی انبار به روز شد.' });

    closeDialog();
  };

  const handleEditPurchase = () => {
    // NOTE: Editing a purchase is a complex operation that should ideally reverse the original stock/cost
    // impact and apply a new one. For this implementation, we will only allow editing non-financial
    // data like date and note to prevent data corruption. A full implementation would require a ledger system.
    if (!dialogState.purchase) return;

    const updatedPurchases = purchases.map(p => {
        if (p.id === dialogState.purchase!.id) {
            return {
                ...p,
                date: purchaseDate,
                note: note,
                // Items, costs, etc., are not editable in this simplified version
            };
        }
        return p;
    });

    dataStore.saveData({ purchases: updatedPurchases });
    toast({ title: 'موفقیت‌آمیز', description: 'فاکتور خرید ویرایش شد.' });
    closeDialog();
  };
  
  const handleArchivePurchase = (purchaseId: string) => {
      const updatedPurchases = purchases.map(p => p.id === purchaseId ? {...p, status: 'archived'} : p);
      dataStore.saveData({ purchases: updatedPurchases });
      toast({ title: 'فاکتور بایگانی شد' });
      setOpenMenuId(null);
  };

  const handleRestorePurchase = (purchaseId: string) => {
      const updatedPurchases = purchases.map(p => p.id === purchaseId ? {...p, status: 'active'} : p);
      dataStore.saveData({ purchases: updatedPurchases });
      toast({ title: 'فاکتور بازیابی شد' });
      setOpenMenuId(null);
  };

  const handleDeletePurchase = (purchaseId: string) => {
      // Hard delete is generally discouraged for financial records.
      // We recommend archiving instead. This is a placeholder for a safe-delete check.
      // For now, we will simply filter it out.
      const purchaseToDelete = purchases.find(p => p.id === purchaseId);
      if (!purchaseToDelete) return;

      if (purchaseToDelete.status !== 'archived') {
         toast({
            variant: "destructive",
            title: "حذف امکان‌پذیر نیست",
            description: "فقط فاکتورهای بایگانی شده را می‌توان برای همیشه حذف کرد.",
          });
        return;
      }

      // Reverse the inventory impact before deleting
      let tempIngredients = ingredients.map(i => ({...i}));
      let tempProducts = products.map(p => ({...p}));

      for (const item of purchaseToDelete.items) {
        if (item.type === 'ingredient') {
          const itemId = item.itemId.split('-').slice(1).join('-');
          const originalIngredientIndex = tempIngredients.findIndex(i => i.id === itemId);
          if (originalIngredientIndex !== -1) {
            const originalIngredient = tempIngredients[originalIngredientIndex];
            const oldStock = originalIngredient.stock;
            const newStock = Math.max(0, oldStock - item.quantity); // Prevent negative stock
            originalIngredient.stock = newStock;
            // Note: avgBuyPrice is not recalculated for simplicity, as it would require full ledger
          }
        } else { // Product
          const itemId = item.itemId.split('-').slice(1).join('-');
          const originalProductIndex = tempProducts.findIndex(p => p.id === itemId);
          if (originalProductIndex !== -1) {
            const originalProduct = tempProducts[originalProductIndex];
            const oldStock = originalProduct.stock;
            const newStock = Math.max(0, oldStock - item.quantity);
            originalProduct.stock = newStock;
          }
        }
      }

      // In a real app, you'd check for dependencies before hard deleting.
      const updatedPurchases = purchases.filter(p => p.id !== purchaseId);
      dataStore.saveData({ ingredients: tempIngredients, products: tempProducts, purchases: updatedPurchases });
      toast({ title: 'فاکتور برای همیشه حذف شد و موجودی انبار بروزرسانی شد' });
      setOpenMenuId(null);
  };

 const renderTable = (purchaseList: Purchase[]) => (
    <Card>
      <CardHeader>
        <CardTitle>{activeTab === 'active' ? 'فاکتورهای خرید فعال' : 'فاکتورهای بایگانی شده'}</CardTitle>
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
              <TableHead><span className="sr-only">عملیات</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseList.length > 0 ? (
              purchaseList.map(pur => {
                const totalValue = (pur.items || []).reduce((sum, item) => sum + (item.lineTotalCost || 0), 0) + (pur.transportCost || 0);
                return (
                    <TableRow key={pur.id}>
                        <TableCell>{formatJalali(new Date(pur.date), 'yyyy/MM/dd')}</TableCell>
                        <TableCell>{(pur.items || []).map(i => i.itemName).join('، ')}</TableCell>
                        <TableCell>{(pur.transportCost || 0).toLocaleString('fa-IR')} تومان</TableCell>
                        <TableCell className="font-semibold">{Math.round(totalValue).toLocaleString('fa-IR')} تومان</TableCell>
                        <TableCell className="text-left">
                           <DropdownMenu open={openMenuId === pur.id} onOpenChange={(isOpen) => setOpenMenuId(isOpen ? pur.id : null)}>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">باز کردن منو</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  {pur.status !== 'archived' ? (
                                      <>
                                          <DropdownMenuItem onClick={() => openDialog('edit', pur)}>
                                              <Pencil className="ml-2 h-4 w-4" /> ویرایش
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleArchivePurchase(pur.id)}>
                                              <Archive className="ml-2 h-4 w-4" /> بایگانی
                                          </DropdownMenuItem>
                                      </>
                                  ) : (
                                      <>
                                          <DropdownMenuItem onClick={() => handleRestorePurchase(pur.id)}>
                                              <ArchiveRestore className="ml-2 h-4 w-4" /> بازیابی
                                          </DropdownMenuItem>
                                          <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="ml-2 h-4 w-4" /> حذف دائمی
                                                  </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>آیا مطمئن هستید؟</AlertDialogTitle>
                                                    <AlertDialogDescription>این عمل غیرقابل بازگشت است و ممکن است بر میانگین قیمت خرید تاثیر بگذارد. توصیه می‌شود به جای حذف، بایگانی کنید.</AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>لغو</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDeletePurchase(pur.id)}>تایید و حذف دائمی</AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                          </AlertDialog>
                                      </>
                                  )}
                              </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  خریدی در این بخش ثبت نشده است.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter>
            <div className="text-xs text-muted-foreground">
                نمایش <strong>{purchaseList.length}</strong> از <strong>{purchases.filter(p => (p.status || 'active') === activeTab).length}</strong> فاکتور
            </div>
        </CardFooter>
    </Card>
 );
 
 const renderSkeleton = () => (
     <Card>
        <CardHeader>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        {[...Array(5)].map((_, i) => <TableHead key={i}><Skeleton className="h-6 w-full" /></TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                            {[...Array(5)].map((_, j) => <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>)}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
        <CardFooter>
            <Skeleton className="h-4 w-40" />
        </CardFooter>
     </Card>
 );

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="خرید" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="ثبت خرید">
          <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => { if (!isOpen) closeDialog(); }}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog('add')}>
                <PlusCircle className="ml-2 h-4 w-4" /> ثبت فاکتور خرید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{dialogState.mode === 'add' ? 'ثبت فاکتور خرید جدید' : 'ویرایش فاکتور خرید'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">تاریخ فاکتور</Label>
                    <Input id="date" type="text" placeholder="مثال: ۱۴۰۴/۱۰/۱۵" value={formatJalali(new Date(purchaseDate), 'yyyy/MM/dd')} onChange={(e) => {
                        try {
                            const parsed = parseJalali(e.target.value, 'yyyy/MM/dd', new Date());
                            if (!isNaN(parsed.getTime())) {
                                setPurchaseDate(parsed.toISOString());
                            }
                        } catch (error) {
                            // Invalid date, ignore
                        }
                    }} disabled={dialogState.mode === 'edit'} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="note">یادداشت (اختیاری)</Label>
                    <Input id="note" value={note} onChange={e => setNote(e.target.value)} disabled={dialogState.mode === 'edit'} />
                </div>
                </div>

                <Separator className="my-4" />
                <Label className="font-bold">اقلام خریداری شده</Label>
                
                <div className="space-y-4">
                  {purchaseItems.map((item, index) => {
                     const selectedItem = allItemsMap.get(item.itemId || '');
                     const unitLabel = selectedItem && 'unit' in selectedItem ? unitLabels[selectedItem.unit] : 'عدد';
                     const calculatedUnitPrice = (item.lineTotalCost || 0) / (item.quantity || 1);
                     const isEditDisabled = dialogState.mode === 'edit';

                    return (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start p-2 border rounded-md">
                          <div className="col-span-12 md:col-span-4 space-y-2">
                            <Label>نام کالا</Label>
                            <Select value={item.itemId} onValueChange={val => handleItemChange(index, 'itemId', val)} disabled={isEditDisabled}>
                              <SelectTrigger><SelectValue placeholder="انتخاب کالا..." /></SelectTrigger>
                              <SelectContent position="popper">
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
                            <Input type="number" placeholder="0" value={item.quantity || ''} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))} disabled={isEditDisabled} />
                          </div>
                          <div className="col-span-6 md:col-span-4 space-y-2">
                            <Label>مبلغ کل ردیف (تومان)</Label>
                            <Input type="number" placeholder="0" value={item.lineTotalCost || ''} onChange={e => handleItemChange(index, 'lineTotalCost', parseFloat(e.target.value))} disabled={isEditDisabled} />
                             {item.lineTotalCost && item.quantity ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                    قیمت واحد: {Math.round(calculatedUnitPrice).toLocaleString('fa-IR')} ت
                                </p>
                             ) : null}
                          </div>
                          <div className="col-span-12 md:col-span-1 flex justify-end items-center pt-6">
                            <Button variant="ghost" size="icon" onClick={() => removePurchaseLine(index)} disabled={purchaseItems.length === 1 || isEditDisabled}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                    )
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={addPurchaseLine} className="mt-2" disabled={dialogState.mode === 'edit'}>
                  <PlusCircle className="ml-2 h-4 w-4" /> افزودن ردیف
                </Button>

                <Separator className="my-4" />
                
                 <div className="space-y-2">
                    <Label htmlFor="transportCost">هزینه حمل و نقل (تومان)</Label>
                    <Input id="transportCost" type="number" value={transportCost} onChange={(e) => setTransportCost(e.target.value)} placeholder="0" disabled={dialogState.mode === 'edit'} />
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
                <Button type="button" variant="secondary" onClick={closeDialog}>لغو</Button>
                <Button type="submit" onClick={handleSavePurchase}>{dialogState.mode === 'add' ? 'ثبت فاکتور' : 'ذخیره تغییرات'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="active">فعال</TabsTrigger>
                <TabsTrigger value="archived">بایگانی</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
                {isClient ? renderTable(filteredPurchases) : renderSkeleton()}
            </TabsContent>
            <TabsContent value="archived">
                {isClient ? renderTable(filteredPurchases) : renderSkeleton()}
            </TabsContent>
        </Tabs>
        
      </main>
    </div>
  );
}
