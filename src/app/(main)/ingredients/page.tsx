'use client';

import Image from 'next/image';
import { PlusCircle, Upload } from 'lucide-react';
import { ingredients as initialIngredients } from '@/lib/data';
import { type Ingredient, type Unit } from '@/lib/types';
import { unitLabels } from '@/lib/types';
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
import { useEffect, useState, useMemo, ChangeEvent } from 'react';
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

const INGREDIENTS_STORAGE_KEY = 'gym-canteen-ingredients';

export default function IngredientsPage() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newIngredient, setNewIngredient] = useState<{name: string; unit: Unit, imageUrl?: string}>({ name: '', unit: 'g' });
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

    const filteredIngredients = useMemo(() => {
        return ingredients.filter(ingredient =>
            ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [ingredients, searchQuery]);

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewIngredient({ ...newIngredient, imageUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAddIngredient = () => {
        const { name, unit, imageUrl } = newIngredient;
        if (!name || !unit) {
            toast({
                variant: "destructive",
                title: "خطا",
                description: "لطفاً نام و واحد ماده اولیه را پر کنید.",
            });
            return;
        }

        const newIngredientData: Ingredient = {
            id: `ing-${Date.now()}`,
            name,
            stock: 0,
            avgBuyPrice: 0,
            imageUrl,
            unit,
        };

        const updatedIngredients = [...ingredients, newIngredientData];
        setIngredients(updatedIngredients);
        localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(updatedIngredients));
        
        toast({
            title: "موفقیت‌آمیز",
            description: `ماده اولیه "${name}" با موفقیت اضافه شد. برای افزودن موجودی به صفحه خرید مراجعه کنید.`,
        });

        setIsDialogOpen(false);
        setNewIngredient({ name: '', unit: 'g' });
    };

    return (
        <div className="flex flex-col h-full">
            <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="مواد اولیه" />
            <main className="flex-1 p-4 sm:px-6 sm:py-6">
                <PageHeader title="مواد اولیه">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="ml-2 h-4 w-4" /> افزودن نوع ماده اولیه
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>افزودن نوع ماده اولیه جدید</DialogTitle>
                                <DialogDescription>
                                    موجودی اولیه صفر است. برای افزودن موجودی به صفحه خرید مراجعه کنید.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="name" className="text-right">نام</Label>
                                  <Input
                                    id="name"
                                    value={newIngredient.name}
                                    onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                                    className="col-span-3"
                                    placeholder="مثال: سینه مرغ"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="unit" className="text-right">واحد پایه</Label>
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
                                    <Label htmlFor="image-upload" className="text-right">تصویر</Label>
                                    <div className="col-span-3">
                                        <Input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                        <Label htmlFor="image-upload" className="cursor-pointer flex items-center justify-center border-2 border-dashed rounded-md p-4 text-sm text-muted-foreground hover:bg-muted">
                                            {newIngredient.imageUrl ? <Image src={newIngredient.imageUrl} alt="Preview" width={80} height={80} className="rounded-md object-cover"/> : <><Upload className="mr-2 h-4 w-4"/> <span>آپلود تصویر</span></>}
                                        </Label>
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
                        <CardTitle>انبار مواد اولیه</CardTitle>
                        <CardDescription>مواد اولیه و موجودی انبار خود را مدیریت کنید.</CardDescription>
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
                                    const stockToDisplay = ingredient.stock;
                                    const unitLabel = unitLabels[ingredient.unit];
                                    
                                    return (
                                        <TableRow key={ingredient.id}>
                                            <TableCell className="hidden sm:table-cell align-middle">
                                                {ingredient.imageUrl ? (
                                                    <Image
                                                        alt={ingredient.name}
                                                        className="aspect-square rounded-md object-cover"
                                                        height="64"
                                                        src={ingredient.imageUrl}
                                                        width="64"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                                                        <span className="text-xs text-muted-foreground">No Image</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium align-middle">{ingredient.name}</TableCell>
                                            <TableCell className="align-middle">
                                                <Badge variant={stockToDisplay > 0 ? 'outline' : 'destructive'}>{stockToDisplay.toLocaleString('fa-IR')} {unitLabel}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell align-middle">{ingredient.avgBuyPrice > 0 ? `${Math.round(ingredient.avgBuyPrice).toLocaleString('fa-IR')} تومان / ${unitLabel}` : '-'}</TableCell>
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
