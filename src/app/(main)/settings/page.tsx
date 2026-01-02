
'use client';

import { useState, useRef } from 'react';
import { useAppData, dataStore } from '@/lib/store';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { AppData } from '@/lib/types';

export default function SettingsPage() {
  const appData = useAppData();
  const { toast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [dataToImport, setDataToImport] = useState<AppData | null>(null);

  const handleExport = () => {
    try {
      const dataString = JSON.stringify(appData, null, 2);
      const blob = new Blob([dataString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-gym-canteen-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'موفق', description: 'فایل پشتیبان با موفقیت دانلود شد.' });
    } catch (error) {
      console.error('Failed to export data:', error);
      toast({ variant: 'destructive', title: 'خطا', description: 'خطایی در تولید فایل پشتیبان رخ داد.' });
    }
  };

  const handleImportTrigger = () => {
    importInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = JSON.parse(text);
            // Basic validation
            if (parsedData.products && parsedData.ingredients && parsedData.orders) {
                setDataToImport(parsedData);
                setIsImportConfirmOpen(true);
            } else {
                 toast({ variant: 'destructive', title: 'خطا', description: 'فایل پشتیبان معتبر نیست.' });
            }
          }
        } catch (error) {
          console.error('Failed to import data:', error);
          toast({ variant: 'destructive', title: 'خطا', description: 'فایل انتخاب شده معتبر نیست.' });
        }
      };
      reader.readAsText(file);
    }
     // Reset file input to allow re-uploading the same file
    if(event.target) {
        event.target.value = '';
    }
  };
  
  const executeImport = () => {
    if (dataToImport) {
      if (dataStore.importData(dataToImport)) {
         toast({ title: 'موفق', description: 'داده‌ها با موفقیت بازیابی شدند. برنامه مجدداً بارگذاری می‌شود.' });
         setTimeout(() => window.location.reload(), 1500);
      } else {
         toast({ variant: 'destructive', title: 'خطا', description: 'خطایی در بازیابی داده‌ها رخ داد.' });
      }
    }
    setIsImportConfirmOpen(false);
    setDataToImport(null);
  };

  const handleReset = () => {
    try {
        dataStore.resetData();
        toast({ title: 'موفق', description: 'تمام داده‌ها به حالت اولیه بازنشانی شدند. برنامه مجدداً بارگذاری می‌شود.' });
        setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
        console.error('Failed to reset data:', error);
        toast({ variant: 'destructive', title: 'خطا', description: 'خطایی در بازنشانی داده‌ها رخ داد.' });
    }
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="تنظیمات" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="تنظیمات و مدیریت داده" />

        <div className="grid gap-6 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>پشتیبان‌گیری و بازیابی</CardTitle>
                    <CardDescription>از تمام داده‌های برنامه خود فایل پشتیبان تهیه کرده یا داده‌های قبلی را بازیابی کنید.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Button onClick={handleExport}><Download className="ml-2 h-4 w-4" />خروجی گرفتن از داده‌ها</Button>
                    <Button variant="outline" onClick={handleImportTrigger}><Upload className="ml-2 h-4 w-4" />وارد کردن از فایل</Button>
                    <input type="file" accept=".json" ref={importInputRef} onChange={handleFileSelect} className="hidden" />
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">منطقه خطر</CardTitle>
                    <CardDescription>این عملیات غیرقابل بازگشت هستند. با احتیاط کامل ادامه دهید.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
                        <Trash2 className="ml-2 h-4 w-4" />
                        بازنشانی کامل داده‌ها
                    </Button>
                </CardContent>
            </Card>
        </div>

        {/* Import Confirmation Dialog */}
        <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-amber-500" />آیا از بازیابی داده‌ها مطمئن هستید؟</AlertDialogTitle>
                    <AlertDialogDescription>این عمل، تمام داده‌های فعلی شما را با محتوای فایل پشتیبان جایگزین خواهد کرد. این کار غیرقابل بازگشت است.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>لغو</AlertDialogCancel>
                    <AlertDialogAction onClick={executeImport}>تایید و بازیابی</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        {/* Reset Confirmation Dialog */}
        <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" />آیا از بازنشانی کامل مطمئن هستید؟</AlertDialogTitle>
                    <AlertDialogDescription>این عمل تمام داده‌های برنامه شما از جمله محصولات، سفارشات، مشتریان و ... را برای همیشه حذف کرده و برنامه را به حالت اولیه باز می‌گرداند.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>لغو</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleReset}>تایید و حذف همه چیز</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </main>
    </div>
  );
}
