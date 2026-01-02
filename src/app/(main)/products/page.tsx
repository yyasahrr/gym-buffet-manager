'use client';

import Image from 'next/image';
import { PlusCircle, MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { Product, Order } from '@/lib/types';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppData, dataStore } from '@/lib/store';

type DialogState = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    product: Product | null;
}

const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));

export default function ProductsPage() {
  const { products, orders } = useAppData();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false, mode: 'add', product: null });
  const [formData, setFormData] = useState({ name: '', sellPrice: '' });
  
  const { toast } = useToast();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.status === activeTab &&
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery, activeTab]);

  const openDialog = (mode: 'add' | 'edit', product: Product | null = null) => {
    setDialogState({ isOpen: true, mode, product });
    if (mode === 'edit' && product) {
        setFormData({ name: product.name, sellPrice: String(product.sellPrice) });
    } else {
        setFormData({ name: '', sellPrice: '' });
    }
  };

  const closeDialog = () => {
    setDialogState({ isOpen: false, mode: 'add', product: null });
  };
  
  const handleSaveProduct = () => {
    const { name, sellPrice } = formData;
    if (!name || !sellPrice || parseFloat(sellPrice) < 0) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "لطفاً نام و قیمت فروش معتبر وارد کنید.",
      });
      return;
    }
    
    if (dialogState.mode === 'add') {
        const newProductData: Product = {
          id: `prod-${Date.now()}`,
          name,
          stock: 0, 
          avgBuyPrice: 0,
          sellPrice: parseInt(sellPrice, 10),
          imageId: 'protein_powder', // default image
          status: 'active',
        };

        const updatedProducts = [...products, newProductData];
        dataStore.saveData({ products: updatedProducts });
        
        toast({
          title: "موفقیت‌آمیز",
          description: `محصول "${name}" با موفقیت اضافه شد.`,
        });
    } else if (dialogState.mode === 'edit' && dialogState.product) {
        const updatedProducts = products.map(p => 
            p.id === dialogState.product!.id ? { ...p, name, sellPrice: parseInt(sellPrice, 10) } : p
        );
        dataStore.saveData({ products: updatedProducts });
        toast({ title: "موفقیت‌آمیز", description: `محصول "${name}" با موفقیت ویرایش شد.` });
    }


    closeDialog();
  };
  
  const handleArchiveProduct = (productId: string) => {
    const updatedProducts = products.map(p => p.id === productId ? { ...p, status: 'archived' } : p);
    dataStore.saveData({ products: updatedProducts });
    toast({ title: "محصول بایگانی شد" });
    setOpenMenuId(null);
  };
  
  const handleRestoreProduct = (productId: string) => {
    const updatedProducts = products.map(p => p.id === productId ? { ...p, status: 'active' } : p);
    dataStore.saveData({ products: updatedProducts });
    toast({ title: "محصول بازیابی شد" });
    setOpenMenuId(null);
  };

  const handleDeleteProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if(!product) return;

    const hasUsageHistory = orders.some((order: any) => order.items.some((item: any) => item.item.id === productId));

    if(product.stock > 0 || hasUsageHistory) {
      toast({
        variant: "destructive",
        title: "حذف امکان‌پذیر نیست",
        description: "این محصول دارای موجودی یا سابقه فروش است. ابتدا آن را بایگانی کنید.",
      });
    } else {
      const updatedProducts = products.filter(p => p.id !== productId);
      dataStore.saveData({ products: updatedProducts });
      toast({ title: "محصول برای همیشه حذف شد"});
    }
    setOpenMenuId(null);
  }

  const renderTable = (productList: Product[]) => (
     <Card>
        <CardHeader>
            <CardTitle>{activeTab === 'active' ? 'محصولات فعال' : 'محصولات بایگانی شده'}</CardTitle>
            <CardDescription>
                {activeTab === 'active' ? 'محصولات خود را مدیریت کرده و سطح موجودی آنها را مشاهده کنید.' : 'این محصولات در صفحه سفارشات نمایش داده نمی‌شوند.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">
                        <span className="sr-only">تصویر</span>
                    </TableHead>
                    <TableHead>نام</TableHead>
                    <TableHead>موجودی</TableHead>
                    <TableHead className="hidden md:table-cell">میانگین قیمت خرید</TableHead>
                    <TableHead>قیمت فروش</TableHead>
                    <TableHead>
                        <span className="sr-only">عملیات</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {productList.map(product => {
                        const image = imageMap.get(product.imageId);
                        return (
                            <TableRow key={product.id}>
                                <TableCell className="hidden sm:table-cell align-middle">
                                    {image && (
                                        <Image
                                            alt={product.name}
                                            className="aspect-square rounded-md object-cover"
                                            height="64"
                                            src={image.imageUrl}
                                            width="64"
                                            data-ai-hint={image.imageHint}
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="font-medium align-middle">{product.name}</TableCell>
                                <TableCell className="align-middle">
                                    <Badge variant={product.stock > 0 ? 'outline' : 'destructive'}>{product.stock}</Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell align-middle">{product.avgBuyPrice > 0 ? product.avgBuyPrice.toLocaleString('fa-IR') + ' تومان' : 'بدون سابقه خرید'}</TableCell>
                                <TableCell className="align-middle">{product.sellPrice.toLocaleString('fa-IR')} تومان</TableCell>
                                <TableCell className="text-left">
                                     <DropdownMenu open={openMenuId === product.id} onOpenChange={(isOpen) => setOpenMenuId(isOpen ? product.id : null)}>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">باز کردن منو</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                        {product.status === 'active' ? (
                                            <>
                                                <DropdownMenuItem onClick={() => openDialog('edit', product)}>
                                                    <Pencil className="ml-2 h-4 w-4" />
                                                    ویرایش
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleArchiveProduct(product.id)}>
                                                    <Archive className="ml-2 h-4 w-4" />
                                                    بایگانی
                                                </DropdownMenuItem>
                                            </>
                                        ) : (
                                            <>
                                                <DropdownMenuItem onClick={() => handleRestoreProduct(product.id)}>
                                                    <ArchiveRestore className="ml-2 h-4 w-4" />
                                                    بازیابی
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="ml-2 h-4 w-4" />
                                                            <span>حذف دائمی</span>
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>آیا مطمئن هستید؟</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                این عمل غیرقابل بازگشت است. فقط در صورتی ادامه دهید که محصول سابقه فروش نداشته و موجودی آن صفر باشد.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>لغو</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-destructive hover:bg-destructive/90"
                                                                onClick={() => handleDeleteProduct(product.id)}
                                                            >
                                                                تایید و حذف دائمی
                                                            </AlertDialogAction>
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
                    })}
                </TableBody>
            </Table>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground">
            نمایش <strong>{filteredProducts.length}</strong> از <strong>{products.filter(p=>p.status === activeTab).length}</strong> محصول
            </div>
        </CardFooter>
    </Card>
  );


  return (
    <div className="flex flex-col h-full">
        <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="محصولات" />
        <main className="flex-1 p-4 sm:px-6 sm:py-6">
            <PageHeader title="محصولات">
                <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                    <DialogTrigger asChild>
                        <Button onClick={() => openDialog('add')}>
                            <PlusCircle className="ml-2 h-4 w-4" /> افزودن محصول
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{dialogState.mode === 'add' ? 'افزودن محصول جدید' : 'ویرایش محصول'}</DialogTitle>
                            <DialogDescription>
                                {dialogState.mode === 'add' && 'محصول جدید با موجودی اولیه صفر ایجاد می‌شود. برای افزایش موجودی به صفحه خرید مراجعه کنید.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">نام</Label>
                                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="col-span-3"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sellPrice" className="text-right">قیمت فروش</Label>
                                <Input id="sellPrice" type="number" value={formData.sellPrice} onChange={(e) => setFormData({...formData, sellPrice: e.target.value})} className="col-span-3"/>
                            </div>
                        </div>
                        <DialogFooter>
                             <Button type="button" variant="secondary" onClick={closeDialog}>لغو</Button>
                             <Button type="submit" onClick={handleSaveProduct}>ذخیره</Button>
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
                    {renderTable(filteredProducts)}
                </TabsContent>
                <TabsContent value="archived">
                    {renderTable(filteredProducts)}
                </TabsContent>
            </Tabs>
        </main>
    </div>
  );
}
