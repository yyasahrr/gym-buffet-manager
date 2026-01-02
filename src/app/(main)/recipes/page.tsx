import { PlusCircle } from 'lucide-react';
import Image from 'next/image';
import { foods, ingredients as allIngredients } from '@/lib/data';
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

const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));
const ingredientMap = new Map(allIngredients.map(i => [i.id, i]));

const calculateCost = (recipe: typeof foods[0]['recipe']) => {
  return recipe.reduce((total, item) => {
    const ingredient = ingredientMap.get(item.ingredientId);
    if (!ingredient) return total;
    return total + ingredient.avgBuyPrice * item.quantity;
  }, 0);
};

export default function RecipesPage() {
  return (
    <div className="flex flex-col sm:gap-4 sm:py-4">
      <Header breadcrumbs={[]} activeBreadcrumb="Recipes" />
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <PageHeader title="Food Recipes">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Recipe
          </Button>
        </PageHeader>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {foods.map(food => {
            const cost = calculateCost(food.recipe);
            const profit = food.sellPrice - cost;
            const image = imageMap.get(food.imageId);

            return (
              <Card key={food.id}>
                <CardHeader className="p-0 border-b">
                  {image && (
                     <div className="aspect-video relative">
                        <Image
                            src={image.imageUrl}
                            alt={food.name}
                            fill
                            className="object-cover rounded-t-lg"
                            data-ai-hint={image.imageHint}
                        />
                     </div>
                  )}
                </CardHeader>
                <CardContent className="p-6">
                    <CardTitle className="mb-2">{food.name}</CardTitle>
                    <CardDescription>Ingredients:</CardDescription>
                    <ul className="list-disc list-inside text-sm text-muted-foreground my-2">
                        {food.recipe.map(item => {
                            const ingredient = ingredientMap.get(item.ingredientId);
                            return <li key={item.ingredientId}>{ingredient?.name} ({item.quantity})</li>
                        })}
                    </ul>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                            <p className="font-semibold">${food.sellPrice.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Sell Price</p>
                        </div>
                        <div>
                            <p className="font-semibold">${cost.toFixed(2)}</p>
                             <p className="text-xs text-muted-foreground">Cost</p>
                        </div>
                        <div>
                            <p className="font-semibold text-primary">${profit.toFixed(2)}</p>
                             <p className="text-xs text-muted-foreground">Profit</p>
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
