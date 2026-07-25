'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppData } from '@/lib/store';
import { setManagementPin, verifyPin, loginSession, authConfigured, authenticate, loginAsUser, sha256, changeUserPassword } from '@/lib/management-auth';
import { setActiveRole } from '@/lib/rbac';
import { dataStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { UserAccount } from '@/lib/types';

export default function ManagementLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { account, users } = useAppData();
  const hasUsers = (users || []).length > 0;

  const [mode, setMode] = useState<'user' | 'setup' | 'pin'>('user');
  const [uName, setUName] = useState('');
  const [uPass, setUPass] = useState('');
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);
  const [forceOpen, setForceOpen] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [newPassConfirm, setNewPassConfirm] = useState('');
  const [aName, setAName] = useState('');
  const [aUser, setAUser] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(hasUsers ? 'user' : 'setup');
  }, [hasUsers]);

  const required = !!account?.requireManagementAuth;

  const handleUserLogin = async () => {
    if (!uName || !uPass) {
      toast({ variant: 'destructive', title: 'خطا', description: 'نام‌کاربری و گذرواژه را وارد کنید.' });
      return;
    }
    setBusy(true);
    try {
      const user = await authenticate(uName.trim(), uPass);
      if (!user) {
        toast({ variant: 'destructive', title: 'خطا', description: 'نام‌کاربری یا گذرواژه اشتباه است.' });
        return;
      }
      if (user.mustChangePassword) {
        setPendingUser(user);
        setForceOpen(true);
        setBusy(false);
        return;
      }
      loginAsUser(user);
      setActiveRole(user.role);
      router.replace('/dashboard');
    } finally {
      setBusy(false);
    }
  };

  const doForceChange = async () => {
    if (!pendingUser) return;
    if (newPass.length < 4) {
      toast({ variant: 'destructive', title: 'خطا', description: 'گذرواژه باید حداقل ۴ کاراکتر باشد.' });
      return;
    }
    if (newPass !== newPassConfirm) {
      toast({ variant: 'destructive', title: 'خطا', description: 'گذرواژه و تکرار آن یکسان نیستند.' });
      return;
    }
    await changeUserPassword(pendingUser.id, newPass);
    setForceOpen(false);
    setNewPass('');
    setNewPassConfirm('');
    loginAsUser(pendingUser);
    setActiveRole(pendingUser.role);
    toast({ title: 'موفق', description: 'گذرواژه تغییر یافت.' });
    router.replace('/dashboard');
  };

  const handleCreateAdmin = async () => {
    if (!aName.trim() || !aUser.trim()) {
      toast({ variant: 'destructive', title: 'خطا', description: 'نام و نام‌کاربری مدیر را وارد کنید.' });
      return;
    }
    if (pin.length < 4) {
      toast({ variant: 'destructive', title: 'خطا', description: 'گذرواژه باید حداقل ۴ رقم/حرف باشد.' });
      return;
    }
    if (pin !== confirmPin) {
      toast({ variant: 'destructive', title: 'خطا', description: 'گذرواژه و تکرار آن یکسان نیستند.' });
      return;
    }
    setBusy(true);
    try {
      const hash = await sha256(pin);
      const user: UserAccount = {
        id: uid('user'), username: aUser.trim(), name: aName.trim(), role: 'super_admin',
        passwordHash: hash, active: true, createdAt: new Date().toISOString(),
      };
      dataStore.saveData((cur) => ({
        ...cur,
        users: [...(cur.users || []), user],
        account: { ...cur.account, requireManagementAuth: true },
      }));
      loginAsUser(user);
      setActiveRole('super_admin');
      toast({ title: 'موفق', description: 'اولین مدیر ایجاد و وارد شد.' });
      router.replace('/dashboard');
    } finally {
      setBusy(false);
    }
  };

  const handlePinEnter = async () => {
    if (!pin) {
      toast({ variant: 'destructive', title: 'خطا', description: 'رمز عبور را وارد کنید.' });
      return;
    }
    setBusy(true);
    try {
      const ok = await verifyPin(pin);
      if (!ok) {
        toast({ variant: 'destructive', title: 'خطا', description: 'رمز عبور اشتباه است.' });
        return;
      }
      const name = account?.managerName || account?.buffet?.ownerName || 'مدیر';
      loginSession('super_admin', name);
      setActiveRole('super_admin');
      router.replace('/dashboard');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>ورود به پنل مدیریت</CardTitle>
          <CardDescription>
            {mode === 'setup' ? 'اولین بار است؛ حساب مدیر کل را ایجاد کنید.' : 'نام‌کاربری و گذرواژه خود را وارد نمایید.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'setup' ? (
            <>
              <div className="space-y-2">
                <Label>نام مدیر</Label>
                <Input value={aName} onChange={(e) => setAName(e.target.value)} placeholder="مثال: علی مدیری" />
              </div>
              <div className="space-y-2">
                <Label>نام‌کاربری</Label>
                <Input value={aUser} onChange={(e) => setAUser(e.target.value)} dir="ltr" placeholder="admin" />
              </div>
              <div className="space-y-2">
                <Label>گذرواژه (حداقل ۴ کاراکتر)</Label>
                <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>تکرار گذرواژه</Label>
                <Input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} dir="ltr" />
              </div>
              <Button className="w-full" onClick={handleCreateAdmin} disabled={busy}>
                <Lock className="ml-2 h-4 w-4" /> ایجاد و ورود
              </Button>
              {authConfigured() && (
                <Button variant="link" className="w-full text-xs" onClick={() => setMode('pin')}>
                  ورود با رمز مدیریت (PIN)
                </Button>
              )}
            </>
          ) : mode === 'user' ? (
            <>
              <div className="space-y-2">
                <Label>نام‌کاربری</Label>
                <Input value={uName} onChange={(e) => setUName(e.target.value)} dir="ltr" placeholder="admin" onKeyDown={(e) => e.key === 'Enter' && handleUserLogin()} />
              </div>
              <div className="space-y-2">
                <Label>گذرواژه</Label>
                <Input type="password" value={uPass} onChange={(e) => setUPass(e.target.value)} dir="ltr" onKeyDown={(e) => e.key === 'Enter' && handleUserLogin()} />
              </div>
              <Button className="w-full" onClick={handleUserLogin} disabled={busy}>
                <Lock className="ml-2 h-4 w-4" /> ورود
              </Button>
              {authConfigured() && (
                <Button variant="link" className="w-full text-xs" onClick={() => setMode('pin')}>
                  ورود با رمز مدیریت (PIN)
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>رمز مدیریت (PIN)</Label>
                <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} dir="ltr" onKeyDown={(e) => e.key === 'Enter' && handlePinEnter()} />
              </div>
              <Button className="w-full" onClick={handlePinEnter} disabled={busy}>
                <Lock className="ml-2 h-4 w-4" /> ورود با PIN
              </Button>
              <Button variant="link" className="w-full text-xs" onClick={() => setMode('user')}>
                بازگشت به ورود کاربران
              </Button>
            </>
          )}
          <Link href="/" className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> بازگشت به خانه
          </Link>
          <Link href="/apply-trainer" className="flex items-center justify-center gap-1 text-xs text-primary hover:underline">
            درخواست همکاری به عنوان مربی
          </Link>
        </CardContent>
      </Card>

      <Dialog open={forceOpen} onOpenChange={setForceOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>تغییر گذرواژه (اجباری)</DialogTitle>
            <DialogDescription>با توجه به اینکه گذرواژهٔ شما پیش‌فرض بوده است، لطفاً یک گذرواژهٔ جدید و ایمن انتخاب کنید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>گذرواژه جدید</Label><Input type="password" dir="ltr" value={newPass} onChange={(e) => setNewPass(e.target.value)} /></div>
            <div className="space-y-1"><Label>تکرار گذرواژه</Label><Input type="password" dir="ltr" value={newPassConfirm} onChange={(e) => setNewPassConfirm(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button onClick={doForceChange}>تغییر گذرواژه و ادامه</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
