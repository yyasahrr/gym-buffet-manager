
'use client';

import { useState, useRef } from 'react';
import { useAppData, dataStore } from '@/lib/store';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { resizeImage } from '@/lib/utils';
import { Pencil } from 'lucide-react';
import type { Account } from '@/lib/types';


export default function AccountPage() {
  const { account } = useAppData();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Account>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);

  const openEditDialog = () => {
    setFormData(account);
    setIsEditDialogOpen(true);
  };
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await resizeImage(file, 256, 0.8);
        setFormData(prev => ({ ...prev, avatarImage: compressedDataUrl }));
      } catch (error) {
        console.error("Image processing failed:", error);
        toast({ variant: "destructive", title: "خطا در پردازش تصویر" });
      }
    }
  };

  const handleSaveChanges = () => {
    dataStore.saveData(currentData => ({
        ...currentData,
        account: {
            ...currentData.account,
            ...formData,
        }
    }));
    toast({ title: "موفق", description: "اطلاعات با موفقیت ذخیره شد." });
    setIsEditDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="حساب کاربری" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="حساب کاربری">
           <Button onClick={openEditDialog}><Pencil className="ml-2 h-4 w-4" />ویرایش پروفایل</Button>
        </PageHeader>

        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="relative inline-block mx-auto mb-4">
              <Avatar className="w-24 h-24 text-4xl">
                <AvatarImage src={account.avatarImage} alt={account.managerName} />
                <AvatarFallback>{account.businessName?.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">{account.businessName}</CardTitle>
            <CardDescription>{account.managerName}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
             <div className="flex justify-between py-2 border-b">
                 <span className="text-muted-foreground">نام کسب و کار</span>
                 <span className="font-medium">{account.businessName}</span>
             </div>
              <div className="flex justify-between py-2 border-b">
                 <span className="text-muted-foreground">نام مدیر</span>
                 <span className="font-medium">{account.managerName}</span>
             </div>
              <div className="flex justify-between py-2">
                 <span className="text-muted-foreground">شماره تماس</span>
                 <span className="font-medium">{account.phone || '-'}</span>
             </div>
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ویرایش اطلاعات کاربری</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 text-2xl">
                        <AvatarImage src={formData.avatarImage} />
                        <AvatarFallback>{formData.businessName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="flex-1"/>
                </div>
              <div className="space-y-2">
                <Label htmlFor="businessName">نام کسب و کار</Label>
                <Input id="businessName" value={formData.businessName || ''} onChange={(e) => setFormData(p => ({...p, businessName: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="managerName">نام مدیر</Label>
                <Input id="managerName" value={formData.managerName || ''} onChange={(e) => setFormData(p => ({...p, managerName: e.target.value}))} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="phone">شماره تماس</Label>
                <Input id="phone" value={formData.phone || ''} onChange={(e) => setFormData(p => ({...p, phone: e.target.value}))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsEditDialogOpen(false)}>لغو</Button>
              <Button onClick={handleSaveChanges}>ذخیره تغییرات</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
