'use client';

import Image from 'next/image';
import { PlusCircle } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { products as initialProducts, Product } from '@/lib/data';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));
const PRODUCTS_STORAGE_KEY = 'gym-canteen-products';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    stock: '',
    avgBuyPrice: '',
    sellPrice: '',
    imageId: 'protein_powder',
  });
  const { toast } = useToast();

  useEffect(() => {
    const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    } else {
      setProducts(initialProducts);
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(initialProducts));
    }
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);
  
  const handleAddProduct = () => {
    const { name, stock, avgBuyPrice, sellPrice, imageId } = newProduct;
    if (!name || !stock || !avgBuyPrice || !sellPrice) {
      toast({
        variant: "destructive",
        title: "خطا",
        description: "لطفاً تمام فیلدها را پر کنید.",
      });
      return;
    }

    const newProductData: Product = {
      id: `prod-${Date.now()}`,
      name,
      stock: parseInt(stock, 10),
      avgBuyPrice: parseInt(avgBuyPrice, 10),
      sellPrice: parseInt(sellPrice, 10),
      imageId,
    };

    const updatedProducts = [...products, newProductData];
    setProducts(updatedProducts);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedProducts));
    
    toast({
      title: "موفقیت‌آمیز",
      description: `محصول "${name}" با موفقیت اضافه شد.`,
    });

    setIsDialogOpen(false);
    setNewProduct({ name: '', stock: '', avgBuyPrice: '', sellPrice: '', imageId: 'protein_powder' });
  };

  return (
    <div className="flex flex-col h-full">
        <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="محصولات" />
        <main className="flex-1 p-4 sm:px-6 sm:py-6">
            <PageHeader title="محصولات">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="ml-2 h-4 w-4" /> افزودن محصول
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>افزودن محصول جدید</DialogTitle>
                            <DialogDescription>
                                اطلاعات محصول جدید را برای افزودن به لیست وارد کنید.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">نام</Label>
                                <Input id="name" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="col-span-3"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stock" className="text-right">موجودی</Label>
                                <Input id="stock" type="number" value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} className="col-span-3"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="avgBuyPrice" className="text-right">قیمت خرید</Label>
                                <Input id="avgBuyPrice" type="number" value={newProduct.avgBuyPrice} onChange={(e) => setNewProduct({...newProduct, avgBuyPrice: e.target.value})} className="col-span-3"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sellPrice" className="text-right">قیمت فروش</Label>
                                <Input id="sellPrice" type="number" value={newProduct.sellPrice} onChange={(e) => setNewProduct({...newProduct, sellPrice: e.target.value})} className="col-span-3"/>
                            </div>
                        </div>
                        <DialogFooter>
                             <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>لغو</Button>
                             <Button type="submit" onClick={handleAddProduct}>ذخیره محصول</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle>موجودی محصولات</CardTitle>
                    <CardDescription>محصولات خود را مدیریت کرده و سطح موجودی آنها را مشاهده کنید.</CardDescription>
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
                            <TableHead className="hidden md:table-cell">قیمت خرید</TableHead>
                            <TableHead>قیمت فروش</TableHead>
                            <TableHead className="hidden md:table-cell">تاریخ ایجاد</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map(product => {
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
                                            <Badge variant={product.stock > 20 ? 'outline' : 'destructive'}>{product.stock}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell align-middle">{product.avgBuyPrice.toLocaleString('fa-IR')} تومان</TableCell>
                                        <TableCell className="align-middle">{product.sellPrice.toLocaleString('fa-IR')} تومان</TableCell>
                                        <TableCell className="hidden md:table-cell align-middle">{new Date().toLocaleDateString('fa-IR')}</TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <div className="text-xs text-muted-foreground">
                    نمایش <strong>{filteredProducts.length}</strong> از <strong>{products.length}</strong> محصول
                    </div>
                </CardFooter>
            </Card>
        </main>
    </div>
  );
}
