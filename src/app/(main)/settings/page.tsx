'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppData, dataStore } from '@/lib/store';
import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Trash2, AlertTriangle, ShieldCheck, Bell, Database, Store, Dumbbell, Cloud } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AppData } from '@/lib/types';
import { setManagementPin, authConfigured } from '@/lib/management-auth';
import { logAudit } from '@/lib/audit';
import { bootstrap, login, push, pull, clearSyncSession } from '@/lib/sync';

export default function SettingsPage() {
  const appData = useAppData();
  const { toast } = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [dataToImport, setDataToImport] = useState<AppData | null>(null);

  const [businessName, setBusinessName] = useState(appData.account?.businessName || '');
  const [buffetOwner, setBuffetOwner] = useState(appData.account?.buffet?.ownerName || '');
  const [gymOwner, setGymOwner] = useState(appData.account?.gym?.ownerName || '');
  const [lowStock, setLowStock] = useState(String(appData.account?.lowStockThreshold || 10));
  const [gateway, setGateway] = useState(appData.account?.paymentGateway || 'mock');
  const [requireAuth, setRequireAuth] = useState(!!appData.account?.requireManagementAuth);
  const [enableNotif, setEnableNotif] = useState(!!appData.account?.enableNotifications);

  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const [tenantId, setTenantId] = useState('');
  const [syncUser, setSyncUser] = useState('');
  const [syncPass, setSyncPass] = useState('');
  const [syncServer, setSyncServer] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  const isElectron = typeof window !== 'undefined' && Boolean((window as any).electronAPI?.isElectron);

  // One-click backup: bundle local app data + portal server data into one file.
  const handleExport = async () => {
    try {
      const dataString = JSON.stringify(appData, null, 2);
      let blob = new Blob([dataString], { type: 'application/json' });
      let url = URL.createObjectURL(blob);
      if (isElectron && (window as any).electronAPI?.exportData) {
        const result = await (window as any).electronAPI.exportData(dataString);
        if (result?.success) {
          toast({ title: 'موفق', description: 'فایل پشتیبان با موفقیت ذخیره شد.' });
          return;
        }
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-gym-buffet-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'موفق', description: 'فایل پشتیبان (بوفه + باشگاه) دانلود شد.' });
    } catch (error) {
      console.error('Failed to export data:', error);
      toast({ variant: 'destructive', title: 'خطا', description: 'خطایی در تولید فایل پشتیبان رخ داد.' });
    }
  };

  const saveGeneral = () => {
    dataStore.saveData({
      account: {
        ...appData.account,
        businessName,
        lowStockThreshold: parseInt(lowStock, 10) || 10,
        paymentGateway: gateway as any,
        requireManagementAuth: requireAuth,
        enableNotifications: enableNotif,
        buffet: { ...appData.account?.buffet, ownerName: buffetOwner || 'صاحب بوفه' },
        gym: { ...appData.account?.gym, ownerName: gymOwner || 'صاحب باشگاه' },
      },
    });
    logAudit('data.imported', 'تنظیمات عمومی به‌روزرسانی شد', 'system', 'settings');
    toast({ title: 'ذخیره شد', description: 'تنظیمات با موفقیت ذخیره شد.' });
  };

  const submitPin = async () => {
    if (pin.length < 4) {
      toast({ variant: 'destructive', title: 'خطا', description: 'رمز عبور باید حداقل ۴ رقم باشد.' });
      return;
    }
    if (pin !== pinConfirm) {
      toast({ variant: 'destructive', title: 'خطا', description: 'رمز و تکرار آن یکسان نیستند.' });
      return;
    }
    await setManagementPin(pin);
    setRequireAuth(true);
    setPinOpen(false);
    setPin('');
    setPinConfirm('');
    toast({ title: 'موفق', description: 'رمز عبور مدیریت تنظیم شد.' });
  };

  // import / reset kept from original
  const handleElectronImport = async () => {
    try {
      const result = await (window as any).electronAPI.importData();
      if (!result?.success) return;
      if (result.error) { toast({ variant: 'destructive', title: 'خطا', description: result.error }); return; }
      const parsedData = JSON.parse(result.content);
      if (parsedData.products && parsedData.ingredients && parsedData.orders) { setDataToImport(parsedData); setIsImportConfirmOpen(true); }
      else toast({ variant: 'destructive', title: 'خطا', description: 'فایل پشتیبان معتبر نیست.' });
    } catch (error) { toast({ variant: 'destructive', title: 'خطا', description: 'فایل انتخاب شده معتبر نیست.' }); }
  };
  const handleImportTrigger = () => { if (isElectron && (window as any).electronAPI?.importData) handleElectronImport(); else importInputRef.current?.click(); };
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = JSON.parse(text);
            if (parsedData.products && parsedData.ingredients && parsedData.orders) { setDataToImport(parsedData); setIsImportConfirmOpen(true); }
            else toast({ variant: 'destructive', title: 'خطا', description: 'فایل پشتیبان معتبر نیست.' });
          }
        } catch { toast({ variant: 'destructive', title: 'خطا', description: 'فایل انتخاب شده معتبر نیست.' }); }
      };
      reader.readAsText(file);
    }
    if (event.target) event.target.value = '';
  };
  const executeImport = () => {
    if (dataToImport) {
      if (dataStore.importData(dataToImport)) { toast({ title: 'موفق', description: 'داده‌ها بازیابی شدند.' }); setTimeout(() => window.location.reload(), 1500); }
      else toast({ variant: 'destructive', title: 'خطا', description: 'خطایی در بازیابی رخ داد.' });
    }
    setIsImportConfirmOpen(false);
    setDataToImport(null);
  };
  const handleReset = () => {
    try { dataStore.resetData(); toast({ title: 'موفق', description: 'داده‌ها بازنشانی شدند.' }); setTimeout(() => window.location.reload(), 1500); }
    catch { toast({ variant: 'destructive', title: 'خطا', description: 'خطایی رخ داد.' }); }
    setIsResetConfirmOpen(false);
  };

  const doBootstrap = async () => {
    setSyncing(true); setSyncStatus('');
    try {
      await bootstrap(tenantId.trim(), syncUser.trim(), syncPass, appData, syncServer.trim());
      setSyncStatus('مستأجر ثبت و داده‌ها بارگذاری شد.');
    } catch (e: any) { setSyncStatus(e?.message || 'خطا در ثبت اولیه'); }
    finally { setSyncing(false); }
  };
  const doLogin = async () => {
    setSyncing(true); setSyncStatus('');
    try {
      await login(tenantId.trim(), syncUser.trim(), syncPass, syncServer.trim());
      setSyncStatus('وارد سرور شدید.');
    } catch (e: any) { setSyncStatus(e?.message || 'خطا در ورود'); }
    finally { setSyncing(false); }
  };
  const doPush = async () => {
    setSyncing(true); setSyncStatus('');
    try { await push(appData); setSyncStatus('داده‌ها بارگذاری شدند.'); }
    catch (e: any) { setSyncStatus(e?.message || 'خطا در بارگذاری'); }
    finally { setSyncing(false); }
  };
  const doPull = async () => {
    setSyncing(true); setSyncStatus('');
    try {
      const data = await pull();
      if (dataStore.importData(data)) { setSyncStatus('داده‌ها دریافت و اعمال شدند.'); setTimeout(() => window.location.reload(), 1200); }
      else setSyncStatus('خطا در اعمال داده‌های دریافتی.');
    } catch (e: any) { setSyncStatus(e?.message || 'خطا در دریافت'); }
    finally { setSyncing(false); }
  };
  const doLogout = () => { clearSyncSession(); setSyncStatus('از سرور خارج شدید.'); };

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="تنظیمات" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="تنظیمات و مدیریت داده" />

        <div className="grid gap-6 max-w-3xl mx-auto">
          {/* Business units — keep buffet & gym as two separate owners */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> حساب‌های تجاری (مجزا)</CardTitle>
              <CardDescription>نام مجموعه و صاحبان دو واحد بوفه و باشگاه را وارد کنید. حساب‌ها به‌طور پیش‌فرض مجزا نگه داشته می‌شوند (اگر بوفه اجاره داده شود، درآمد عملیاتی‌اش متعلق به مستأجر است).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">نام مجموعه</Label>
                <Input className="col-span-3" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right flex items-center gap-1"><Dumbbell className="h-4 w-4" /> صاحب باشگاه</Label>
                <Input className="col-span-3" value={gymOwner} onChange={(e) => setGymOwner(e.target.value)} placeholder="نام صاحب حساب باشگاه" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right flex items-center gap-1"><Store className="h-4 w-4" /> صاحب بوفه</Label>
                <Input className="col-span-3" value={buffetOwner} onChange={(e) => setBuffetOwner(e.target.value)} placeholder="نام صاحب حساب بوفه" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>تنظیمات مالی و درگاه</CardTitle>
              <CardDescription>آستانه هشدار موجودی و درگاه پرداخت پیش‌فرض.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">آستانه کم‌بودن</Label>
                <Input className="col-span-3" type="number" value={lowStock} onChange={(e) => setLowStock(e.target.value)} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">درگاه پرداخت</Label>
                <Select value={gateway} onValueChange={setGateway}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mock">شبیه‌سازی‌شده (تستی - پیش‌فرض لوکال)</SelectItem>
                    <SelectItem value="zarinpal">زرین‌پال (نیاز به کلید و هاست)</SelectItem>
                    <SelectItem value="idpay">آیدی‌پی (نیاز به کلید و هاست)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">برای اجرای لوکال، درگاه «شبیه‌سازی‌شده» بدون نیاز به اینترنت یا کلید کار می‌کند.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> احراز هویت مدیریت (RBAC)</CardTitle>
              <CardDescription>فعال‌سازی ورود با رمز عبور برای پنل مدیریت و جداسازی نقش‌ها.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={requireAuth} onCheckedChange={setRequireAuth} id="reqauth" />
                <Label htmlFor="reqauth">نیاز به ورود مدیریت</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPinOpen(true)}>{authConfigured() ? 'تغییر رمز' : 'تنظیم رمز'}</Button>
                {requireAuth && (
                  <Button variant="ghost" onClick={() => { setRequireAuth(false); toast({ title: 'غیرفعال شد' }); }}>غیرفعال‌سازی</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> اعلان‌های محلی</CardTitle>
              <CardDescription>نمایش یادآوری تولد و انقضا از طریق سرویس‌ورکر مرورگر.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Switch checked={enableNotif} onCheckedChange={setEnableNotif} id="notif" />
              <Label htmlFor="notif">فعال‌سازی اعلان‌ها</Label>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveGeneral}>ذخیره تنظیمات</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> پشتیبان‌گیری و بازیابی</CardTitle>
              <CardDescription>یک‌کلیک خروجی کل داده‌ها (بوفه + باشگاه) و بازیابی آن.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={handleExport}><Download className="ml-2 h-4 w-4" /> خروجی یک‌کلیک</Button>
              <Button variant="outline" onClick={handleImportTrigger}><Upload className="ml-2 h-4 w-4" /> وارد کردن</Button>
              <input type="file" accept=".json" ref={importInputRef} onChange={handleFileSelect} className="hidden" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5" /> هم‌سنک ابری (مدل هیبرید)</CardTitle>
              <CardDescription>داده‌ها روی دستگاه شما باقی می‌مانند و هم‌زمان با سرور هم‌سنک می‌شوند (پشتیبان مرکزی و هم‌سنک چنددستگاه).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">شناسه مستأجر</Label>
                <Input className="col-span-3" dir="ltr" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="gym-01" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">نام‌کاربری</Label>
                <Input className="col-span-3" dir="ltr" value={syncUser} onChange={(e) => setSyncUser(e.target.value)} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">رمز عبور</Label>
                <Input className="col-span-3" type="password" dir="ltr" value={syncPass} onChange={(e) => setSyncPass(e.target.value)} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">آدرس سرور</Label>
                <Input className="col-span-3" dir="ltr" value={syncServer} onChange={(e) => setSyncServer(e.target.value)} placeholder="خالی = همین سرور" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={doBootstrap} disabled={syncing}><Cloud className="ml-2 h-4 w-4" /> ثبت اولیه و هم‌سنک</Button>
                <Button variant="outline" onClick={doLogin} disabled={syncing}>ورود به سرور</Button>
                <Button variant="outline" onClick={doPush} disabled={syncing}>بارگذاری (Push)</Button>
                <Button variant="outline" onClick={doPull} disabled={syncing}>دریافت (Pull)</Button>
                <Button variant="ghost" onClick={doLogout}>خروج از سرور</Button>
              </div>
              {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">منطقه خطر</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
                <Trash2 className="ml-2 h-4 w-4" /> بازنشانی کامل داده‌ها
              </Button>
            </CardContent>
          </Card>
        </div>

        <Dialog open={pinOpen} onOpenChange={setPinOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>تنظیم رمز عبور مدیریت</DialogTitle>
              <DialogDescription>حداقل ۴ رقم. این رمز برای ورود به پنل استفاده می‌شود.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1"><Label>رمز عبور</Label><Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} dir="ltr" /></div>
              <div className="space-y-1"><Label>تکرار رمز عبور</Label><Input type="password" inputMode="numeric" value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value)} dir="ltr" /></div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setPinOpen(false)}>انصراف</Button>
              <Button onClick={submitPin}>ذخیره</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isImportConfirmOpen} onOpenChange={setIsImportConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-amber-500" />آیا از بازیابی داده‌ها مطمئن هستید؟</AlertDialogTitle>
              <AlertDialogDescription>این عمل تمام داده‌های فعلی را جایگزین می‌کند.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>لغو</AlertDialogCancel>
              <AlertDialogAction onClick={executeImport}>تایید و بازیابی</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" />آیا از بازنشانی کامل مطمئن هستید؟</AlertDialogTitle>
              <AlertDialogDescription>این عمل تمام داده‌ها را حذف می‌کند.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>لغو</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleReset}>تایید و حذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
