'use client';

import { PlusCircle, Trash2, MoreHorizontal, Pencil, Archive, ArchiveRestore, Upload, XCircle } from 'lucide-react';
import Image from 'next/image';
import { Food, Ingredient, RecipeItem, Order } from '@/lib/types';
import { unitLabels } from '@/lib/types';
import placeholderImages from '@/lib/placeholder-images.json';
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
import { Separator } from '@/components/ui/separator';
import { useEffect, useState, useMemo, useRef } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { resizeImage } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAppData, dataStore } from '@/lib/store';

const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));


type DialogState = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    food: Food | null;
}

const initialFormState = {
    name: '',
    sellPrice: '',
    recipeItems: [{} as Partial<RecipeItem>],
    imageDataUrl: null as string | null,
};


export default function RecipesPage() {
    const { foods, ingredients, orders } = useAppData();
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogState, setDialogState] = useState<DialogState>({ isOpen: false, mode: 'add', food: null });
    const { toast } = useToast();
    
    const [formData, setFormData] = useState(initialFormState);
    const [activeTab, setActiveTab] = useState('active');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    const activeIngredients = useMemo(() => ingredients.filter(i => i.status === 'active'), [ingredients]);
    const ingredientMap = useMemo(() => new Map(ingredients.map(i => [i.id, i])), [ingredients]);

    const calculateCost = (recipe: Partial<RecipeItem>[]) => {
        return recipe.reduce((total, item) => {
            if (!item || !item.ingredientId || !item.quantity) return total;
            const ingredient = ingredientMap.get(item.ingredientId);
            if (!ingredient || ingredient.avgBuyPrice <= 0) return total;
            return total + (ingredient.avgBuyPrice * item.quantity);
        }, 0);
    };

    const filteredFoods = useMemo(() => {
        return foods.filter(food =>
            (food.status || 'active') === activeTab &&
            food.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [foods, searchQuery, activeTab]);
    
    const openDialog = (mode: 'add' | 'edit', food: Food | null = null) => {
        setDialogState({ isOpen: true, mode, food });
        if (mode === 'edit' && food) {
            setFormData({
                name: food.name,
                sellPrice: String(food.sellPrice),
                recipeItems: food.recipe.length > 0 ? [...food.recipe] : [{}],
                imageDataUrl: food.imageDataUrl || null,
            });
        } else {
            setFormData(initialFormState);
        }
    };
    
    const closeDialog = () => {
        setDialogState({ isOpen: false, mode: 'add', food: null });
        setFormData(initialFormState);
    };

    const handleItemChange = (index: number, key: string, value: any) => {
        const updatedItems = [...formData.recipeItems];
        updatedItems[index] = { ...updatedItems[index], [key]: value };
        setFormData({ ...formData, recipeItems: updatedItems });
    };

    const addRecipeLine = () => setFormData(prev => ({ ...prev, recipeItems: [...prev.recipeItems, {}] }));
    const removeRecipeLine = (index: number) => {
        if (formData.recipeItems.length > 1) {
            setFormData(prev => ({ ...prev, recipeItems: prev.recipeItems.filter((_, i) => i !== index) }));
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const compressedDataUrl = await resizeImage(file, 800, 0.8);
                setFormData(prev => ({...prev, imageDataUrl: compressedDataUrl}));
            } catch (error) {
                console.error("Image processing failed:", error);
                toast({ variant: "destructive", title: "خطا در پردازش تصویر" });
            }
        }
    };

    const handleSaveRecipe = () => {
        const { name, sellPrice, recipeItems } = formData;
        if (!name || !sellPrice || parseInt(sellPrice) <= 0) {
            toast({ variant: "destructive", title: "خطا", description: "لطفاً نام و قیمت فروش معتبر را وارد کنید." });
            return;
        }

        const finalRecipeItems: RecipeItem[] = recipeItems
            .filter((item): item is RecipeItem => !!item.ingredientId && !!item.quantity && item.quantity > 0)
            
        if (finalRecipeItems.length === 0) {
            toast({ variant: "destructive", title: "خطا", description: "دستور پخت باید حداقل شامل یک ماده اولیه با مقدار معتبر باشد." });
            return;
        }

        if (dialogState.mode === 'add') {
             const newFood: Food = {
                id: `food-${Date.now()}`,
                name,
                sellPrice: parseInt(sellPrice, 10),
                recipe: finalRecipeItems,
                imageId: 'avocado_toast', // Default placeholder
                imageDataUrl: formData.imageDataUrl,
                status: 'active',
            };
            const updatedFoods = [...foods, newFood];
            dataStore.saveData({ foods: updatedFoods });
            toast({ title: "موفقیت‌آمیز", description: `دستور پخت "${name}" با موفقیت اضافه شد.` });
        } else if (dialogState.mode === 'edit' && dialogState.food) {
            const updatedFoods = foods.map(f => f.id === dialogState.food!.id ? {
                ...f,
                name,
                sellPrice: parseInt(sellPrice, 10),
                recipe: finalRecipeItems,
                imageDataUrl: formData.imageDataUrl,
            } : f);
             dataStore.saveData({ foods: updatedFoods });
             toast({ title: "موفقیت‌آمیز", description: `دستور پخت "${name}" با موفقیت ویرایش شد.` });
        }

        closeDialog();
    };

    const handleArchive = (foodId: string) => {
        const updatedFoods = foods.map(f => f.id === foodId ? { ...f, status: 'archived' } : f);
        dataStore.saveData({ foods: updatedFoods });
        toast({ title: "دستور پخت بایگانی شد" });
        setOpenMenuId(null);
    };

    const handleRestore = (foodId: string) => {
        const updatedFoods = foods.map(f => f.id === foodId ? { ...f, status: 'active' } : f);
        dataStore.saveData({ foods: updatedFoods });
        toast({ title: "دستور پخت بازیابی شد" });
        setOpenMenuId(null);
    };

    const handleDelete = (foodId: string) => {
        const hasOrderHistory = orders.some(order => order.items.some(item => item.item.id === foodId));

        if (hasOrderHistory) {
            toast({
                variant: "destructive",
                title: "حذف امکان‌پذیر نیست",
                description: "این دستور پخت دارای سابقه فروش است. لطفاً ابتدا آن را بایگانی کنید.",
            });
        } else {
            const updatedFoods = foods.filter(f => f.id !== foodId);
            dataStore.saveData({ foods: updatedFoods });
            toast({ title: "دستور پخت برای همیشه حذف شد" });
        }
        setOpenMenuId(null);
    };
    
    const computedCost = useMemo(() => calculateCost(formData.recipeItems), [formData.recipeItems, ingredientMap]);
    const computedProfit = useMemo(() => (parseInt(formData.sellPrice, 10) || 0) - computedCost, [formData.sellPrice, computedCost]);
    const hasCostHistory = useMemo(() => formData.recipeItems.every(item => {
        if (!item.ingredientId) return true; // Ignore empty lines
        const ingredient = ingredientMap.get(item.ingredientId);
        return ingredient && ingredient.avgBuyPrice > 0;
    }), [formData.recipeItems, ingredientMap]);


    const renderRecipeList = (recipeList: Food[]) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {recipeList.map(food => {
            const cost = calculateCost(food.recipe);
            const profit = food.sellPrice - cost;
            const image = imageMap.get(food.imageId);
            const hasFullCostHistory = food.recipe.every(item => {
                 const ingredient = ingredientMap.get(item.ingredientId);
                 return ingredient && ingredient.avgBuyPrice > 0;
            });
            const displayImageUrl = food.imageDataUrl || image?.imageUrl;

            return (
            <Card key={food.id} className="overflow-hidden flex flex-col">
                <CardHeader className="p-0 border-b relative">
                {displayImageUrl && (
                    <div className="aspect-video relative">
                        <Image
                            src={displayImageUrl}
                            alt={food.name}
                            fill
                            className="object-cover"
                            data-ai-hint={image?.imageHint}
                        />
                    </div>
                )}
                 <div className="absolute top-2 right-2">
                    <DropdownMenu open={openMenuId === food.id} onOpenChange={(isOpen) => setOpenMenuId(isOpen ? food.id : null)}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {food.status === 'active' ? (
                                <>
                                    <DropdownMenuItem onClick={() => openDialog('edit', food)}><Pencil className="ml-2 h-4 w-4" /> ویرایش</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleArchive(food.id)}><Archive className="ml-2 h-4 w-4" /> بایگانی</DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem onClick={() => handleRestore(food.id)}><ArchiveRestore className="ml-2 h-4 w-4" /> بازیابی</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                <Trash2 className="ml-2 h-4 w-4" /> حذف دائمی
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>آیا مطمئن هستید؟</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    این عمل غیرقابل بازگشت است. فقط در صورتی ادامه دهید که مطمئن هستید این دستور پخت هیچ سابقه فروشی ندارد.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>لغو</AlertDialogCancel>
                                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(food.id)}>تایید و حذف دائمی</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                </CardHeader>
                <CardContent className="p-6 flex-grow">
                    <CardTitle className="mb-2 text-xl font-bold">{food.name}</CardTitle>
                    <CardDescription>مواد اولیه:</CardDescription>
                    <ul className="list-disc list-inside text-sm text-muted-foreground my-2">
                        {food.recipe.map(item => {
                            const ingredient = ingredientMap.get(item.ingredientId);
                            const unitLabel = ingredient ? unitLabels[ingredient.unit] : '';
                            if (!ingredient) {
                                return <li key={item.ingredientId} className="text-destructive">ماده اولیه حذف شده</li>
                            }
                            return <li key={item.ingredientId}>{ingredient?.name} ({item.quantity} {unitLabel})</li>
                        })}
                    </ul>
                </CardContent>
                 <CardFooter className="flex flex-col items-start p-6 pt-0">
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-2 text-center text-sm w-full">
                        <div>
                            <p className="font-semibold">{(food.sellPrice || 0).toLocaleString('fa-IR')} تومان</p>
                            <p className="text-xs text-muted-foreground">قیمت فروش</p>
                        </div>
                        <div>
                            <p className="font-semibold">{Math.round(cost).toLocaleString('fa-IR')} تومان</p>
                            <p className="text-xs text-muted-foreground">هزینه تمام شده</p>
                            {!hasFullCostHistory && <Badge variant="destructive" className="mt-1 text-xs">تخمینی</Badge>}
                        </div>
                        <div>
                            <p className="font-semibold text-primary">{Math.round(profit).toLocaleString('fa-IR')} تومان</p>
                            <p className="text-xs text-muted-foreground">سود</p>
                        </div>
                    </div>
                </CardFooter>
            </Card>
            );
        })}
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="دستور پخت‌ها" />
            <main className="flex-1 p-4 sm:px-6 sm:py-6">
                <PageHeader title="دستور پخت غذاها">
                    <Button onClick={() => openDialog('add')}>
                        <PlusCircle className="ml-2 h-4 w-4" /> ایجاد دستور پخت
                    </Button>
                </PageHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="active">فعال</TabsTrigger>
                        <TabsTrigger value="archived">بایگانی</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active">
                        {renderRecipeList(filteredFoods)}
                    </TabsContent>
                    <TabsContent value="archived">
                        {renderRecipeList(filteredFoods)}
                    </TabsContent>
                </Tabs>
                
                {/* Add/Edit Dialog */}
                <Dialog open={dialogState.isOpen} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{dialogState.mode === 'add' ? 'ایجاد دستور پخت جدید' : 'ویرایش دستور پخت'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto px-2">
                           <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">نام دستور پخت</Label>
                                    <Input id="name" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="price">قیمت فروش (تومان)</Label>
                                    <Input id="price" type="number" value={formData.sellPrice} onChange={(e) => setFormData(p => ({...p, sellPrice: e.target.value}))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>تصویر دستور پخت</Label>
                                    <Input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageUpload} />
                                    {formData.imageDataUrl ? (
                                        <div className="relative aspect-video rounded-md overflow-hidden">
                                            <Image src={formData.imageDataUrl} alt="Preview" fill objectFit="cover" />
                                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => setFormData(p => ({...p, imageDataUrl: null}))}>
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button variant="outline" className="w-full" onClick={() => imageInputRef.current?.click()}>
                                            <Upload className="ml-2 h-4 w-4" /> آپلود تصویر
                                        </Button>
                                    )}
                                </div>
                                <Card>
                                    <CardHeader className='p-4'>
                                        <CardTitle className='text-base'>پیش‌نمایش هزینه</CardTitle>
                                    </CardHeader>
                                    <CardContent className='p-4 pt-0 text-sm space-y-2'>
                                        <div className='flex justify-between'><span>هزینه تمام‌شده:</span> <span className='font-semibold'>{Math.round(computedCost).toLocaleString('fa-IR')} تومان</span></div>
                                        <div className='flex justify-between'><span>سود تقریبی:</span> <span className='font-semibold'>{Math.round(computedProfit).toLocaleString('fa-IR')} تومان</span></div>
                                        {!hasCostHistory && <Badge variant="destructive" className="mt-1 text-xs">برای بعضی مواد، سابقه خرید ثبت نشده است.</Badge>}
                                    </CardContent>
                                </Card>
                           </div>
                           <div className="space-y-4">
                                <Label className="font-bold">مواد اولیه</Label>
                                {formData.recipeItems.map((item, index) => {
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
                                                <Label>{unitLabel ? `مقدار (${unitLabel})` : 'مقدار'}</Label>
                                                <Input
                                                    type="number"
                                                    className="w-28"
                                                    placeholder='0'
                                                    value={item.quantity || ''}
                                                    onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                                />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removeRecipeLine(index)} disabled={formData.recipeItems.length === 1}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    )
                                })}
                                <Button variant="outline" size="sm" onClick={addRecipeLine} className="mt-2">
                                    <PlusCircle className="ml-2 h-4 w-4" /> افزودن ردیف
                                </Button>
                           </div>
                        </div>
                        <DialogFooter className="pt-4 border-t">
                            <Button type="button" variant="secondary" onClick={closeDialog}>لغو</Button>
                            <Button type="submit" onClick={handleSaveRecipe}>ذخیره</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </main>
        </div>
    );
}
