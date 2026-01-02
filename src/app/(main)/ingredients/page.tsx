'use client';

import { PlusCircle, MoreHorizontal, Pencil, Trash2, Archive, ArchiveRestore } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppData, dataStore } from '@/lib/store';

type DialogState = {
    isOpen: boolean;
    mode: 'add' | 'edit';
    ingredient: Ingredient | null;
}

export default function IngredientsPage() {
    const { ingredients, foods, purchases } = useAppData();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogState, setDialogState] = useState<DialogState>({isOpen: false, mode: 'add', ingredient: null});
    const [formData, setFormData] = useState<{name: string; unit: Unit}>({ name: '', unit: 'g' });
    
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('active');

    useEffect(() => {
        setIsClient(true);
    }, []);

    const filteredIngredients = useMemo(() => {
        return ingredients.filter(ingredient =>
            ingredient.status === activeTab &&
            ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [ingredients, searchQuery, activeTab]);

    const openDialog = (mode: 'add' | 'edit', ingredient: Ingredient | null = null) => {
        setDialogState({ isOpen: true, mode, ingredient });
        if (mode === 'edit' && ingredient) {
            setFormData({ name: ingredient.name, unit: ingredient.unit });
        } else {
            setFormData({ name: '', unit: 'g' });
        }
    };
    
    const closeDialog = () => {
        setDialogState({ isOpen: false, mode: 'add', ingredient: null });
    };
    
    const handleSaveIngredient = () => {
        const { name, unit } = formData;
        if (!name || !unit) {
            toast({ variant: "destructive", title: "خطا", description: "لطفاً نام و واحد ماده اولیه را پر کنید." });
            return;
        }

        if (dialogState.mode === 'add') {
            const newIngredientData: Ingredient = {
                id: `ing-${Date.now()}`,
                name,
                stock: 0,
                avgBuyPrice: 0,
                unit,
                status: 'active',
            };
            const updatedIngredients = [...ingredients, newIngredientData];
            dataStore.saveData({ ingredients: updatedIngredients });
            toast({ title: "موفقیت‌آمیز", description: `ماده اولیه "${name}" با موفقیت اضافه شد.` });
        } else if (dialogState.mode === 'edit' && dialogState.ingredient) {
            const updatedIngredients = ingredients.map(ing => 
                ing.id === dialogState.ingredient!.id ? { ...ing, name, unit } : ing
            );
            dataStore.saveData({ ingredients: updatedIngredients });
            toast({ title: "موفقیت‌آمیز", description: `ماده اولیه "${name}" با موفقیت ویرایش شد.` });
        }

        closeDialog();
    };

    const handleArchiveIngredient = (ingredientId: string) => {
        const updatedIngredients = ingredients.map(ing => 
            ing.id === ingredientId ? { ...ing, status: 'archived' } : ing
        );
        dataStore.saveData({ ingredients: updatedIngredients });
        toast({
            title: "ماده اولیه بایگانی شد",
            description: "این ماده اولیه اکنون در لیست بایگانی قرار دارد.",
        });
        setOpenMenuId(null);
    }
    
    const handleRestoreIngredient = (ingredientId: string) => {
        const updatedIngredients = ingredients.map(ing => 
            ing.id === ingredientId ? { ...ing, status: 'active' } : ing
        );
        dataStore.saveData({ ingredients: updatedIngredients });
        toast({
            title: "ماده اولیه بازگردانی شد",
            description: "این ماده اولیه اکنون در لیست فعال قرار دارد.",
        });
        setOpenMenuId(null);
    }

    const handleDeleteIngredient = (ingredientId: string) => {
        const ingredient = ingredients.find(ing => ing.id === ingredientId);
        if (!ingredient) return;

        const isUsedInRecipe = foods.some(food => food.recipe.some(item => item.ingredientId === ingredientId));
        const hasPurchaseHistory = purchases.some(purchase => purchase.items.some(item => item.itemId === `ingredient-${ingredientId}`));

        if (ingredient.stock > 0 || isUsedInRecipe || hasPurchaseHistory) {
             toast({
                variant: "destructive",
                title: "حذف امکان‌پذیر نیست",
                description: "این ماده اولیه دارای موجودی یا سابقه است و نمی‌توان آن را برای همیشه حذف کرد. لطفاً ابتدا آن را بایگانی کنید.",
            });
        } else {
            const updatedIngredients = ingredients.filter(ing => ing.id !== ingredientId);
            dataStore.saveData({ ingredients: updatedIngredients });
            toast({
                title: "ماده اولیه حذف شد",
                description: `"${ingredient.name}" برای همیشه حذف شد.`,
            });
        }
        setOpenMenuId(null);
    };

    const renderTable = (ingredientList: Ingredient[]) => {
       return (
         <Card>
            <CardHeader>
                <CardTitle>{activeTab === 'active' ? 'انبار مواد اولیه فعال' : 'مواد اولیه بایگانی شده'}</CardTitle>
                <CardDescription>
                    {activeTab === 'active' ? 'مواد اولیه و موجودی انبار خود را مدیریت کنید.' : 'این موارد در لیست‌های خرید و دستور پخت نمایش داده نمی‌شوند.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>نام</TableHead>
                            <TableHead>موجودی</TableHead>
                            <TableHead>میانگین قیمت خرید</TableHead>
                            <TableHead>
                                <span className="sr-only">عملیات</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isClient && ingredientList.map(ingredient => {
                            const stockToDisplay = ingredient.stock;
                            const unitLabel = unitLabels[ingredient.unit] || '';
                            
                            return (
                                <TableRow key={ingredient.id}>
                                    <TableCell className="font-medium align-middle">{ingredient.name}</TableCell>
                                    <TableCell className="align-middle">
                                        <Badge variant={stockToDisplay > 0 ? 'outline' : 'destructive'}>{stockToDisplay.toLocaleString('fa-IR')} {unitLabel}</Badge>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        {ingredient.avgBuyPrice > 0 ? `${Math.round(ingredient.avgBuyPrice).toLocaleString('fa-IR')} تومان / ${unitLabel}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-left">
                                        <DropdownMenu open={openMenuId === ingredient.id} onOpenChange={(isOpen) => setOpenMenuId(isOpen ? ingredient.id : null)}>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">باز کردن منو</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                            {ingredient.status === 'active' ? (
                                                <>
                                                <DropdownMenuItem onClick={() => openDialog('edit', ingredient)}>
                                                    <Pencil className="ml-2 h-4 w-4" />
                                                    ویرایش
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleArchiveIngredient(ingredient.id)}>
                                                    <Archive className="ml-2 h-4 w-4" />
                                                    بایگانی
                                                </DropdownMenuItem>
                                                </>
                                            ) : (
                                                <>
                                                <DropdownMenuItem onClick={() => handleRestoreIngredient(ingredient.id)}>
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
                                                                این عمل غیرقابل بازگشت است. فقط در صورتی ادامه دهید که مطمئن هستید این ماده اولیه هیچ سابقه خرید یا مصرفی ندارد و موجودی آن صفر است.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>لغو</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-destructive hover:bg-destructive/90"
                                                                onClick={() => handleDeleteIngredient(ingredient.id)}
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
                نمایش <strong>{ingredientList.length}</strong> از <strong>{ingredients.filter(i => i.status === activeTab).length}</strong> ماده اولیه
                </div>
            </CardFooter>
        </Card>
       )
    }

    return (
        <div className="flex flex-col h-full">
            <Header onSearch={setSearchQuery} breadcrumbs={[]} activeBreadcrumb="مواد اولیه" />
            <main className="flex-1 p-4 sm:px-6 sm:py-6">
                <PageHeader title="مواد اولیه">
                    <Button onClick={() => openDialog('add')}>
                        <PlusCircle className="ml-2 h-4 w-4" /> افزودن نوع ماده اولیه
                    </Button>
                </PageHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="active">فعال</TabsTrigger>
                        <TabsTrigger value="archived">بایگانی</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active">
                       {renderTable(filteredIngredients)}
                    </TabsContent>
                     <TabsContent value="archived">
                        {renderTable(filteredIngredients)}
                    </TabsContent>
                </Tabs>
                
                {/* Add/Edit Dialog */}
                <Dialog open={dialogState.isOpen} onOpenChange={ (isOpen) => !isOpen && closeDialog() }>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{dialogState.mode === 'add' ? 'افزودن نوع ماده اولیه' : 'ویرایش ماده اولیه'}</DialogTitle>
                            <DialogDescription>
                                {dialogState.mode === 'add' && 'موجودی اولیه صفر است. برای افزودن موجودی به صفحه خرید مراجعه کنید.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">نام</Label>
                                <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                                placeholder="مثال: سینه مرغ"
                                />
                            </div>
                            
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="unit" className="text-right">واحد پایه</Label>
                                <Select value={formData.unit} onValueChange={(value) => setFormData({...formData, unit: value as Unit})}>
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
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={closeDialog}>لغو</Button>
                            <Button type="submit" onClick={handleSaveIngredient}>ذخیره</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </main>
        </div>
    );
}
