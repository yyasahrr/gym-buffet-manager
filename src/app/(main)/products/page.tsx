'use client';

import Image from 'next/image';
import { PlusCircle } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { products } from '@/lib/data';
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
import { useEffect, useState } from 'react';

const imageMap = new Map(placeholderImages.placeholderImages.map(p => [p.id, p]));

export default function ProductsPage() {
  const [currentDate, setCurrentDate] = useState<string | null>(null);

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('fa-IR'));
  }, []);

  return (
    <>
      <Header breadcrumbs={[]} activeBreadcrumb="محصولات" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="محصولات">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> افزودن محصول
            </Button>
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
                {products.map(product => {
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
                            <TableCell className="hidden md:table-cell align-middle">{currentDate}</TableCell>
                        </TableRow>
                    )
                })}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              نمایش <strong>1-{products.length}</strong> از <strong>{products.length}</strong> محصول
            </div>
          </CardFooter>
        </Card>
      </main>
    </>
  );
}
