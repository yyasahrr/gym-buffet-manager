'use client';

import { PlusCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { foods as initialFoods, ingredients as allInitialIngredients, Food, Ingredient, RecipeItem } from '@/lib/data';
import { unitLabels } from '@/lib/types';
import placeholderImages from '@/lib/placeholder-images.json';
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
import { Separator } from '@/components/ui/separator';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));
const FOODS_STORAGE_KEY = 'gym-canteen-foods';
const INGREDIENTS_STORAGE_KEY = 'gym-canteen-ingredients';


export default function RecipesPage() {
    const [foods, setFoods] = useState<Food[]>([]);
    const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();
    
    const [recipeName, setRecipeName] = useState('');
    const [recipePrice, setRecipePrice] = useState('');
    const [recipeItems, setRecipeItems] = useState<Partial<RecipeItem>[]>([{}]);

    useEffect(() => {
        const storedFoods = localStorage.getItem(FOODS_STORAGE_KEY);
        setFoods(storedFoods ? JSON.parse(storedFoods) : initialFoods);

        const storedIngredients = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
        const loadedIngredients = storedIngredients ? JSON.parse(storedIngredients) : allInitialIngredients;
        setAllIngredients(loadedIngredients);
    }, []);
    
    const resetForm = () => {
        setRecipeName('');
        setRecipePrice('');
        setRecipeItems([{}]);
    }
    
    const activeIngredients = useMemo(() => allIngredients.filter(i => i.status === 'active'), [allIngredients]);

    const ingredientMap = useMemo(() => new Map(allIngredients.map(i => [i.id, i])), [allIngredients]);

    const calculateCost = (recipe: RecipeItem[]) => {
        return recipe.reduce((total, item) => {
            const ingredient = ingredientMap.get(item.ingredientId);
            if (!ingredient || ingredient.avgBuyPrice <= 0) return total;
            
            return total + (ingredient.avgBuyPrice * item.quantity);
        }, 0);
    };

    const filteredFoods = useMemo(() => {
        return foods.filter(food =>
            food.status === 'active' &&
            food.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [foods, searchQuery]);
    
    const handleItemChange = (index: number, key: string, value: any) => {
        const updatedItems = [...recipeItems];
        updatedItems[index] = { ...updatedItems[index], [key]: value };
        setRecipeItems(updatedItems);
    };

    const addRecipeLine = () => setRecipeItems([...recipeItems, {}]);
    const removeRecipeLine = (index: number) => {
        if (recipeItems.length > 1) {
            setRecipeItems(recipeItems.filter((_, i) => i !== index));
        }
    };

    const handleSaveRecipe = () => {
        if (!recipeName || !recipePrice || parseInt(recipePrice) <= 0) {
            toast({ variant: "destructive", title: "خطا", description: "لطفاً نام و قیمت فروش معتبر را وارد کنید." });
            return;
        }

        const finalRecipeItems: RecipeItem[] = recipeItems
            .filter((item): item is RecipeItem => !!item.ingredientId && !!item.quantity && item.quantity > 0)
            
        if (finalRecipeItems.length === 0) {
            toast({ variant: "destructive", title: "خطا", description: "دستور پخت باید حداقل شامل یک ماده اولیه با مقدار معتبر باشد." });
            return;
        }

        const newFood: Food = {
            id: `food-${Date.now()}`,
            name: recipeName,
            sellPrice: parseInt(recipePrice, 10),
            recipe: finalRecipeItems,
            imageId: 'avocado_toast', // Default image
            status: 'active',
        };

        const updatedFoods = [...foods, newFood];
        setFoods(updatedFoods);
        localStorage.setItem(FOODS_STORAGE_KEY, JSON.stringify(updatedFoods));

        toast({ title: "موفقیت‌آمیز", description: `دستور پخت "${recipeName}" با موفقیت اضافه شد.` });
        setIsDialogOpen(false);
        resetForm();
    };

    return (
        <div className="flex flex-col h-full">
            <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="دستور پخت‌ها" />
            <main className="flex-1 p-4 sm:px-6 sm:py-6">
                <PageHeader title="دستور پخت غذاها">
                    <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsDialogOpen(isOpen); }}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="ml-2 h-4 w-4" /> ایجاد دستور پخت
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>ایجاد دستور پخت جدید</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">نام دستور پخت</Label>
                                        <Input id="name" value={recipeName} onChange={(e) => setRecipeName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="price">قیمت فروش (تومان)</Label>
                                        <Input id="price" type="number" value={recipePrice} onChange={(e) => setRecipePrice(e.target.value)} />
                                    </div>
                                </div>
                                <Separator />
                                 <Label className="font-bold">مواد اولیه</Label>
                                    <div className="space-y-2">
                                        {recipeItems.map((item, index) => {
                                            const selectedIngredient = activeIngredients.find(i => i.id === item.ingredientId);
                                            const unitLabel = selectedIngredient ? unitLabels[selectedIngredient.unit] : '';
                                            return (
                                                <div key={index} className="flex items-end gap-2">
                                                    <div className='flex-grow space-y-2'>
                                                        <Label>ماده اولیه</Label>
                                                        <Select value={item.ingredientId} onValueChange={val => handleItemChange(index, 'ingredientId', val)}>
                                                            <SelectTrigger><SelectValue placeholder="انتخاب..." /></SelectTrigger>
                                                            <SelectContent>
                                                                {activeIngredients.map(ing => (
                                                                    <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                     <div className='space-y-2'>
                                                        <Label>مقدار ({unitLabel})</Label>
                                                        <Input
                                                            type="number"
                                                            className="w-28"
                                                            placeholder='0'
                                                            value={item.quantity || ''}
                                                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                                        />
                                                     </div>
                                                    <Button variant="ghost" size="icon" onClick={() => removeRecipeLine(index)} disabled={recipeItems.length === 1}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                <Button variant="outline" size="sm" onClick={addRecipeLine} className="mt-2">
                                    <PlusCircle className="ml-2 h-4 w-4" /> افزودن ردیف
                                </Button>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>لغو</Button>
                                <Button type="submit" onClick={handleSaveRecipe}>ذخیره</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </PageHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {filteredFoods.map(food => {
                    const cost = calculateCost(food.recipe);
                    const profit = food.sellPrice - cost;
                    const image = imageMap.get(food.imageId);
                    const hasCostHistory = food.recipe.every(item => {
                         const ingredient = ingredientMap.get(item.ingredientId);
                         return ingredient && ingredient.avgBuyPrice > 0;
                    });

                    return (
                    <Card key={food.id} className="overflow-hidden">
                        <CardHeader className="p-0 border-b">
                        {image && (
                            <div className="aspect-video relative">
                                <Image
                                    src={image.imageUrl}
                                    alt={food.name}
                                    fill
                                    className="object-cover"
                                    data-ai-hint={image.imageHint}
                                />
                            </div>
                        )}
                        </CardHeader>
                        <CardContent className="p-6">
                            <CardTitle className="mb-2 text-xl font-bold">{food.name}</CardTitle>
                            <CardDescription>مواد اولیه:</CardDescription>
                            <ul className="list-disc list-inside text-sm text-muted-foreground my-2">
                                {food.recipe.map(item => {
                                    const ingredient = ingredientMap.get(item.ingredientId);
                                    return <li key={item.ingredientId}>{ingredient?.name} ({item.quantity} {ingredient ? unitLabels[ingredient.unit] : ''})</li>
                                })}
                            </ul>
                            <Separator className="my-4" />
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                <div>
                                    <p className="font-semibold">{food.sellPrice.toLocaleString('fa-IR')} تومان</p>
                                    <p className="text-xs text-muted-foreground">قیمت فروش</p>
                                </div>
                                <div>
                                    <p className="font-semibold">{Math.round(cost).toLocaleString('fa-IR')} تومان</p>
                                    <p className="text-xs text-muted-foreground">هزینه تمام شده</p>
                                    {!hasCostHistory && <p className='text-xs text-destructive'>(تخمینی)</p>}
                                </div>
                                <div>
                                    <p className="font-semibold text-primary">{Math.round(profit).toLocaleString('fa-IR')} تومان</p>
                                    <p className="text-xs text-muted-foreground">سود</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    );
                })}
                </div>
            </main>
        </div>
    );
}
