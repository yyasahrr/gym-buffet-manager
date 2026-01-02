import Image from 'next/image';
import { PlusCircle } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { ingredients } from '@/lib/data';
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

const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));

export default function IngredientsPage() {
  return (
    <div className="flex flex-col sm:gap-4 sm:py-4">
      <Header breadcrumbs={[]} activeBreadcrumb="Ingredients" />
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <PageHeader title="Ingredients">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Ingredient
            </Button>
        </PageHeader>
        <Card>
            <CardHeader>
                <CardTitle>Ingredient Inventory</CardTitle>
                <CardDescription>Manage your ingredients and view their stock levels.</CardDescription>
            </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Image</span>
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Stock (units)</TableHead>
                  <TableHead className="hidden md:table-cell">Avg. Buy Price</TableHead>
                  <TableHead className="hidden md:table-cell">Created at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map(ingredient => {
                    const image = imageMap.get(ingredient.imageId);
                    return (
                        <TableRow key={ingredient.id}>
                            <TableCell className="hidden sm:table-cell">
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
                            <TableCell className="font-medium">{ingredient.name}</TableCell>
                            <TableCell>
                               <Badge variant={ingredient.stock > 20 ? 'outline' : 'destructive'}>{ingredient.stock}</Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">${ingredient.avgBuyPrice.toFixed(2)}</TableCell>
                            <TableCell className="hidden md:table-cell">{new Date().toLocaleDateString()}</TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              Showing <strong>1-{ingredients.length}</strong> of <strong>{ingredients.length}</strong> ingredients
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
