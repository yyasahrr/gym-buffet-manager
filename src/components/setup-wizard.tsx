'use client';

import { useState } from 'react';
import { Rocket, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppData, dataStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logAudit } from '@/lib/audit';

export function SetupWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { account } = useAppData();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState(account?.businessName || 'بوفه باشگاه');
  const [buffetOwner, setBuffetOwner] = useState(account?.buffet?.ownerName || '');
  const [gymOwner, setGymOwner] = useState(account?.gym?.ownerName || '');
  const [lowStock, setLowStock] = useState(String(account?.lowStockThreshold || 10));
  const [gateway, setGateway] = useState<'mock' | 'zarinpal' | 'idpay'>(account?.paymentGateway || 'mock');
  const [planName, setPlanName] = useState('ماهانه عادی');
  const [planPrice, setPlanPrice] = useState('');

  const finish = () => {
    const updates: any = {
      account: {
        ...account,
        businessName,
        lowStockThreshold: parseInt(lowStock, 10) || 10,
        paymentGateway: gateway,
        setupComplete: true,
        buffet: { ...account?.buffet, ownerName: buffetOwner || 'صاحب بوفه', businessName: 'بوفه ' + (businessName || '') },
        gym: { ...account?.gym, ownerName: gymOwner || 'صاحب باشگاه', businessName: 'باشگاه ' + (businessName || '') },
      },
    };
    // Create a starter membership plan if none exist.
    const price = parseInt(planPrice, 10);
    if (price > 0) {
      const plan = {
        id: `plan-${Date.now()}`,
        name: planName || 'ماهانه عادی',
        category: 'regular' as const,
        period: 'monthly' as const,
        price,
        description: 'پلن پیش‌فرض ایجاد شده در راه‌اندازی',
        status: 'active' as const,
      };
      updates.membershipPlans = [...(dataStore.getSnapshot().membershipPlans || []), plan];
    }
    dataStore.saveData(updates);
    logAudit('data.imported', 'راه‌اندازی اولیه انجام شد', 'system', 'setup');
    toast({ title: 'راه‌اندازی انجام شد', description: 'تنظیمات اولیه ذخیره شد.' });
    onOpenChange(false);
  };

  const steps = [
    {
      title: 'اطلاعات کسب‌وکار',
      content: (
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">نام مجموعه</Label>
            <Input className="col-span-3" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">صاحب بوفه</Label>
            <Input className="col-span-3" value={buffetOwner} onChange={(e) => setBuffetOwner(e.target.value)} placeholder="نام صاحب حساب بوفه" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">صاحب باشگاه</Label>
            <Input className="col-span-3" value={gymOwner} onChange={(e) => setGymOwner(e.target.value)} placeholder="نام صاحب حساب باشگاه" />
          </div>
          <p className="text-xs text-muted-foreground">حساب بوفه و باشگاه همیشه جدا می‌مانند و با هم ترکیب نمی‌شوند.</p>
        </div>
      ),
    },
    {
      title: 'تنظیمات مالی',
      content: (
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">آستانه کم‌بودن</Label>
            <Input className="col-span-3" type="number" value={lowStock} onChange={(e) => setLowStock(e.target.value)} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">درگاه پرداخت</Label>
            <Select value={gateway} onValueChange={(v) => setGateway(v as any)}>
              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">شبیه‌سازی‌شده (تستی - پیش‌فرض)</SelectItem>
                <SelectItem value="zarinpal">زرین‌پال</SelectItem>
                <SelectItem value="idpay">آیدی‌پی</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">درگاه mock برای اجرای لوکال بدون نیاز به کلید روی هاست تنظیم شده است.</p>
        </div>
      ),
    },
    {
      title: 'اولین پلن شهریه',
      content: (
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">نام پلن</Label>
            <Input className="col-span-3" value={planName} onChange={(e) => setPlanName(e.target.value)} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">مبلغ (تومان)</Label>
            <Input className="col-span-3" type="number" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} placeholder="مثال: 1500000" />
          </div>
          <p className="text-xs text-muted-foreground">این پلن برای شروع در پورتال مشتری منتشر می‌شود.</p>
        </div>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Rocket className="h-5 w-5 text-primary" /> راه‌اندازی اولیه</DialogTitle>
          <DialogDescription>گام {step + 1} از {steps.length}: {steps[step].title}</DialogDescription>
        </DialogHeader>
        {steps[step].content}
        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>
            {step === 0 ? 'بعداً' : 'قبلی'}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>بعدی</Button>
          ) : (
            <Button onClick={finish}><CheckCircle2 className="ml-2 h-4 w-4" /> پایان راه‌اندازی</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
