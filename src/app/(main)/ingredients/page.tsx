'use client';

import Image from 'next/image';
import { PlusCircle } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { ingredients as initialIngredients, Ingredient } from '@/lib/data';
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
const INGREDIENTS_STORAGE_KEY = 'gym-canteen-ingredients';


export default function IngredientsPage() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newIngredient, setNewIngredient] = useState({ name: '', stock: '', avgBuyPrice: '' });
    const { toast } = useToast();

    useEffect(() => {
        const storedIngredients = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
        if (storedIngredients) {
            setIngredients(JSON.parse(storedIngredients));
        } else {
            setIngredients(initialIngredients);
            localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(initialIngredients));
        }
    }, []);

    const filteredIngredients = useMemo(() => {
        return ingredients.filter(ingredient =>
            ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [ingredients, searchQuery]);

    const handleAddIngredient = () => {
        const { name, stock, avgBuyPrice } = newIngredient;
        if (!name || !stock || !avgBuyPrice) {
            toast({
                variant: "destructive",
                title: "خطا",
                description: "لطفاً تمام فیلدها را پر کنید.",
            });
            return;
        }

        const newIngredientData: Ingredient = {
            id: `ing-${Date.now()}`,
            name,
            stock: parseInt(stock, 10),
            avgBuyPrice: parseInt(avgBuyPrice, 10),
            imageId: 'tomato', // Default image
        };

        const updatedIngredients = [...ingredients, newIngredientData];
        setIngredients(updatedIngredients);
        localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(updatedIngredients));
        
        toast({
            title: "موفقیت‌آمیز",
            description: `ماده اولیه "${name}" با موفقیت اضافه شد.`,
        });

        setIsDialogOpen(false);
        setNewIngredient({ name: '', stock: '', avgBuyPrice: '' });
    };

    return (
        <div className="flex flex-col h-full">
            <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="مواد اولیه" />
            <main className="flex-1 p-4 sm:px-6 sm:py-6">
                <PageHeader title="مواد اولیه">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="ml-2 h-4 w-4" /> افزودن ماده اولیه
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>افزودن ماده اولیه جدید</DialogTitle>
                                <DialogDescription>
                                    اطلاعات ماده اولیه جدید را وارد کنید.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">نام</Label>
                                    <Input id="name" value={newIngredient.name} onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})} className="col-span-3"/>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="stock" className="text-right">موجودی</Label>
                                    <Input id="stock" type="number" value={newIngredient.stock} onChange={(e) => setNewIngredient({...newIngredient, stock: e.target.value})} className="col-span-3"/>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="avgBuyPrice" className="text-right">قیمت خرید</Label>
                                    <Input id="avgBuyPrice" type="number" value={newIngredient.avgBuyPrice} onChange={(e) => setNewIngredient({...newIngredient, avgBuyPrice: e.target.value})} className="col-span-3"/>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>لغو</Button>
                                <Button type="submit" onClick={handleAddIngredient}>ذخیره</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </PageHeader>
                <Card>
                    <CardHeader>
                        <CardTitle>موجودی مواد اولیه</CardTitle>
                        <CardDescription>مواد اولیه خود را مدیریت کرده و سطح موجودی آنها را مشاهده کنید.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="hidden w-[100px] sm:table-cell">
                                    <span className="sr-only">تصویر</span>
                                </TableHead>
                                <TableHead>نام</TableHead>
                                <TableHead>موجودی (واحد)</TableHead>
                                <TableHead className="hidden md:table-cell">میانگین قیمت خرید</TableHead>
                                <TableHead className="hidden md:table-cell">تاریخ ایجاد</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredIngredients.map(ingredient => {
                                    const image = imageMap.get(ingredient.imageId);
                                    return (
                                        <TableRow key={ingredient.id}>
                                            <TableCell className="hidden sm:table-cell align-middle">
                                                {image && (
                                                    <Image
                                                        alt={ingredient.name}
                                                        className="aspect-square rounded-md object-cover"
                                                        height="64"
                                                        src={image.imageUrl}
                                                        width="64"
                                                        data-ai-hint={image.imageHint}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium align-middle">{ingredient.name}</TableCell>
                                            <TableCell className="align-middle">
                                            <Badge variant={ingredient.stock > 20 ? 'outline' : 'destructive'}>{ingredient.stock}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell align-middle">{ingredient.avgBuyPrice.toLocaleString('fa-IR')} تومان</TableCell>
                                            <TableCell className="hidden md:table-cell align-middle">{new Date().toLocaleDateString('fa-IR')}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <div className="text-xs text-muted-foreground">
                        نمایش <strong>{filteredIngredients.length}</strong> از <strong>{ingredients.length}</strong> ماده اولیه
                        </div>
                    </CardFooter>
                </Card>
            </main>
        </div>
    );
}
