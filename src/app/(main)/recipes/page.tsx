'use client';

import { PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { foods as initialFoods, ingredients as allInitialIngredients, Food, Ingredient, RecipeItem } from '@/lib/data';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';


const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));
const FOODS_STORAGE_KEY = 'gym-canteen-foods';
const INGREDIENTS_STORAGE_KEY = 'gym-canteen-ingredients';


export default function RecipesPage() {
    const [foods, setFoods] = useState<Food[]>([]);
    const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();
    
    const [newRecipeName, setNewRecipeName] = useState('');
    const [newRecipePrice, setNewRecipePrice] = useState('');
    const [selectedIngredients, setSelectedIngredients] = useState<Record<string, {checked: boolean, quantity: string}>>({});

    useEffect(() => {
        const storedFoods = localStorage.getItem(FOODS_STORAGE_KEY);
        setFoods(storedFoods ? JSON.parse(storedFoods) : initialFoods);

        const storedIngredients = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
        setAllIngredients(storedIngredients ? JSON.parse(storedIngredients) : allInitialIngredients);
    }, []);

    const ingredientMap = useMemo(() => new Map(allIngredients.map(i => [i.id, i])), [allIngredients]);

    const calculateCost = (recipe: RecipeItem[]) => {
        return recipe.reduce((total, item) => {
            const ingredient = ingredientMap.get(item.ingredientId);
            if (!ingredient) return total;
            return total + ingredient.avgBuyPrice * item.quantity;
        }, 0);
    };

    const filteredFoods = useMemo(() => {
        return foods.filter(food =>
            food.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [foods, searchQuery]);

    const handleAddRecipe = () => {
        if (!newRecipeName || !newRecipePrice || Object.keys(selectedIngredients).length === 0) {
            toast({ variant: "destructive", title: "خطا", description: "لطفاً نام، قیمت و حداقل یک ماده اولیه را مشخص کنید." });
            return;
        }

        const recipeItems: RecipeItem[] = Object.entries(selectedIngredients)
            .filter(([, val]) => val.checked && val.quantity && parseFloat(val.quantity) > 0)
            .map(([id, val]) => ({ ingredientId: id, quantity: parseFloat(val.quantity) }));

        if (recipeItems.length === 0) {
            toast({ variant: "destructive", title: "خطا", description: "لطفاً برای مواد اولیه انتخاب شده مقدار مشخص کنید." });
            return;
        }

        const newFood: Food = {
            id: `food-${Date.now()}`,
            name: newRecipeName,
            sellPrice: parseInt(newRecipePrice, 10),
            recipe: recipeItems,
            imageId: 'avocado_toast', // Default image
        };

        const updatedFoods = [...foods, newFood];
        setFoods(updatedFoods);
        localStorage.setItem(FOODS_STORAGE_KEY, JSON.stringify(updatedFoods));

        toast({ title: "موفقیت‌آمیز", description: `دستور پخت "${newRecipeName}" با موفقیت اضافه شد.` });
        setIsDialogOpen(false);
        setNewRecipeName('');
        setNewRecipePrice('');
        setSelectedIngredients({});
    };

    return (
        <div className="flex flex-col h-full">
            <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="دستور پخت‌ها" />
            <main className="flex-1 p-4 sm:px-6 sm:py-6">
                <PageHeader title="دستور پخت غذاها">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="ml-2 h-4 w-4" /> ایجاد دستور پخت
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>ایجاد دستور پخت جدید</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">نام دستور پخت</Label>
                                    <Input id="name" value={newRecipeName} onChange={(e) => setNewRecipeName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">قیمت فروش</Label>
                                    <Input id="price" type="number" value={newRecipePrice} onChange={(e) => setNewRecipePrice(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>مواد اولیه</Label>
                                    <ScrollArea className="h-48 rounded-md border p-4">
                                        <div className="space-y-4">
                                            {allIngredients.map(ing => (
                                                <div key={ing.id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`ing-${ing.id}`}
                                                            checked={selectedIngredients[ing.id]?.checked || false}
                                                            onCheckedChange={(checked) => {
                                                                const current = {...selectedIngredients};
                                                                if (checked) {
                                                                    current[ing.id] = { checked: true, quantity: current[ing.id]?.quantity || ''};
                                                                } else {
                                                                    delete current[ing.id];
                                                                }
                                                                setSelectedIngredients(current);
                                                            }}
                                                        />
                                                        <Label htmlFor={`ing-${ing.id}`}>{ing.name}</Label>
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        placeholder="مقدار"
                                                        className="w-24 h-8"
                                                        value={selectedIngredients[ing.id]?.quantity || ''}
                                                        disabled={!selectedIngredients[ing.id]?.checked}
                                                        onChange={(e) => setSelectedIngredients({
                                                            ...selectedIngredients,
                                                            [ing.id]: { ...selectedIngredients[ing.id], quantity: e.target.value }
                                                        })}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>لغو</Button>
                                <Button type="submit" onClick={handleAddRecipe}>ذخیره</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </PageHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {filteredFoods.map(food => {
                    const cost = calculateCost(food.recipe);
                    const profit = food.sellPrice - cost;
                    const image = imageMap.get(food.imageId);

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
                                    return <li key={item.ingredientId}>{ingredient?.name} ({item.quantity})</li>
                                })}
                            </ul>
                            <Separator className="my-4" />
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                <div>
                                    <p className="font-semibold">{food.sellPrice.toLocaleString('fa-IR')} تومان</p>
                                    <p className="text-xs text-muted-foreground">قیمت فروش</p>
                                </div>
                                <div>
                                    <p className="font-semibold">{cost.toLocaleString('fa-IR')} تومان</p>
                                    <p className="text-xs text-muted-foreground">هزینه</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-primary">{profit.toLocaleString('fa-IR')} تومان</p>
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
