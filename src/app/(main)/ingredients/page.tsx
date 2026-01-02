'use client';

import Image from 'next/image';
import { PlusCircle } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { ingredients as initialIngredients } from '@/lib/data';
import { type Ingredient, type Unit, unitLabels } from '@/lib/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';

const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));
const INGREDIENTS_STORAGE_KEY = 'gym-canteen-ingredients';

const packagingTypes = [
    "دانه‌ای",
    "بسته ۳۰تایی",
    "بسته‌بندی ۲۵۰ گرمی",
    "بسته‌بندی ۵۰۰ گرمی",
    "بسته‌بندی ۱ کیلویی",
    "شیشه",
    "قوطی",
];

export default function IngredientsPage() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newIngredient, setNewIngredient] = useState<{name: string; variantName: string; stock: string; avgBuyPrice: string; unit: Unit, imageId: string}>({ name: '', variantName: '', stock: '', avgBuyPrice: '', unit: 'g', imageId: 'tomato' });
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const storedIngredients = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
        if (storedIngredients) {
            setIngredients(JSON.parse(storedIngredients));
        } else {
            setIngredients(initialIngredients);
            localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(initialIngredients));
        }
    }, []);

    const uniqueIngredientNames = useMemo(() => {
        const names = new Set(ingredients.map(i => i.name));
        return Array.from(names).map(name => ({ value: name, label: name }));
    }, [ingredients]);


    const filteredIngredients = useMemo(() => {
        return ingredients.filter(ingredient =>
            ingredient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ingredient.variantName?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [ingredients, searchQuery]);

    const handleAddIngredient = () => {
        const { name, variantName, stock, avgBuyPrice, unit, imageId } = newIngredient;
        if (!name || !stock || !avgBuyPrice || !unit) {
            toast({
                variant: "destructive",
                title: "خطا",
                description: "لطفاً تمام فیلدهای لازم را پر کنید.",
            });
            return;
        }

        const newIngredientData: Ingredient = {
            id: `ing-${Date.now()}`,
            name,
            variantName: variantName || undefined,
            stock: parseInt(stock, 10),
            avgBuyPrice: parseInt(avgBuyPrice, 10),
            imageId: imageId,
            unit,
        };

        const updatedIngredients = [...ingredients, newIngredientData];
        setIngredients(updatedIngredients);
        localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(updatedIngredients));
        
        toast({
            title: "موفقیت‌آمیز",
            description: `ماده اولیه "${name} ${variantName || ''}" با موفقیت اضافه شد.`,
        });

        setIsDialogOpen(false);
        setNewIngredient({ name: '', variantName: '', stock: '', avgBuyPrice: '', unit: 'g', imageId: 'tomato' });
    };

    const totalPurchasePrice = useMemo(() => {
        const quantity = parseFloat(newIngredient.stock) || 0;
        const pricePerUnit = parseFloat(newIngredient.avgBuyPrice) || 0;
        return quantity * pricePerUnit;
    }, [newIngredient.stock, newIngredient.avgBuyPrice]);
    
    const handleNameSelect = (name: string) => {
        const existingIngredient = ingredients.find(i => i.name === name);
        if (existingIngredient) {
            setNewIngredient({
                ...newIngredient,
                name: existingIngredient.name,
                unit: existingIngredient.unit,
                imageId: existingIngredient.imageId,
            });
        } else {
            setNewIngredient({
                ...newIngredient,
                name: name,
                imageId: 'tomato' // Default for brand new items
            });
        }
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
                                    اطلاعات ماده اولیه جدید را وارد کنید. می‌توانید از مواد اولیه موجود انتخاب کنید.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">نام</Label>
                                    <Combobox
                                        items={uniqueIngredientNames}
                                        value={newIngredient.name}
                                        onChange={handleNameSelect}
                                        placeholder="انتخاب یا ورود نام..."
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="variantName" className="text-right">نوع بسته</Label>
                                    <Select value={newIngredient.variantName} onValueChange={(value) => setNewIngredient({...newIngredient, variantName: value})}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="انتخاب نوع بسته‌بندی" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {packagingTypes.map((type) => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="unit" className="text-right">واحد</Label>
                                    <Select value={newIngredient.unit} onValueChange={(value) => setNewIngredient({...newIngredient, unit: value as Unit})}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="انتخاب واحد" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(unitLabels).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="stock" className="text-right">مقدار</Label>
                                    <Input id="stock" type="number" value={newIngredient.stock} onChange={(e) => setNewIngredient({...newIngredient, stock: e.target.value})} className="col-span-3"/>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="avgBuyPrice" className="text-right">قیمت خرید (هر واحد)</Label>
                                    <Input id="avgBuyPrice" type="number" value={newIngredient.avgBuyPrice} onChange={(e) => setNewIngredient({...newIngredient, avgBuyPrice: e.target.value})} className="col-span-3"/>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">قیمت کل خرید</Label>
                                    <div className="col-span-3 font-bold">
                                        {totalPurchasePrice.toLocaleString('fa-IR')} تومان
                                    </div>
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
                                <TableHead>موجودی</TableHead>
                                <TableHead className="hidden md:table-cell">میانگین قیمت خرید</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isClient && filteredIngredients.map(ingredient => {
                                    const image = imageMap.get(ingredient.imageId);
                                    const displayName = `${ingredient.name} ${ingredient.variantName ? `(${ingredient.variantName})` : ''}`;
                                    const stockToDisplay = ingredient.stock;
                                    const unitLabel = unitLabels[ingredient.unit];
                                    
                                    return (
                                        <TableRow key={ingredient.id}>
                                            <TableCell className="hidden sm:table-cell align-middle">
                                                {image ? (
                                                    <Image
                                                        alt={displayName}
                                                        className="aspect-square rounded-md object-cover"
                                                        height="64"
                                                        src={image.imageUrl}
                                                        width="64"
                                                        data-ai-hint={image.imageHint}
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                                                        <span className="text-xs text-muted-foreground">No Image</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium align-middle">{displayName}</TableCell>
                                            <TableCell className="align-middle">
                                                <Badge variant={stockToDisplay > 20 ? 'outline' : 'destructive'}>{stockToDisplay.toLocaleString('fa-IR')} {unitLabel}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell align-middle">{ingredient.avgBuyPrice.toLocaleString('fa-IR')} تومان / {unitLabel}</TableCell>
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
