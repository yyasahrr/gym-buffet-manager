'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus, KeyRound, Smartphone, IdCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'form' | 'otp'>('form');

  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [family, setFamily] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(nationalId)) {
      toast({ variant: 'destructive', title: 'خطا', description: 'کد ملی باید ۱۰ رقم باشد.' });
      return;
    }
    if (!/^09\d{9}$/.test(phone)) {
      toast({ variant: 'destructive', title: 'خطا', description: 'شماره موبایل معتبر نیست.' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/customer/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nationalId,
          phone,
          name: mode === 'register' ? name : undefined,
          family: mode === 'register' ? family : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'ارسال کد ناموفق' });
        return;
      }
      setStep('otp');
      toast({ title: 'کد ارسال شد', description: 'کد تایید به شماره موبایل شما ارسال گردید.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با سرور برقرار نشد' });
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{4,6}$/.test(code)) {
      toast({ variant: 'destructive', title: 'خطا', description: 'کد تایید را وارد کنید.' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/customer/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationalId, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'خطا', description: data.error || 'تایید ناموفق' });
        return;
      }
      toast({ title: 'خوش آمدید', description: 'وارد حساب کاربری خود شدید.' });
      router.push('/customer');
    } catch (e) {
      toast({ variant: 'destructive', title: 'خطا', description: 'ارتباط با سرور برقرار نشد' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">پورتال مشتریان باشگاه</CardTitle>
          <CardDescription>ورود یا ثبت‌نام با کد ملی و کد تایید پیامکی</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => { setMode(v as 'login' | 'register'); setStep('form'); }}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="login"><LogIn className="ml-2 h-4 w-4" /> ورود</TabsTrigger>
              <TabsTrigger value="register"><UserPlus className="ml-2 h-4 w-4" /> ثبت‌نام</TabsTrigger>
            </TabsList>

            {step === 'form' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><IdCard className="h-4 w-4" /> کد ملی</Label>
                  <Input value={nationalId} onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="۱۰ رقم" dir="ltr" inputMode="numeric" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> شماره موبایل</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="09..." dir="ltr" inputMode="tel" />
                </div>
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>نام</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام" />
                    </div>
                    <div className="space-y-2">
                      <Label>نام خانوادگی</Label>
                      <Input value={family} onChange={(e) => setFamily(e.target.value)} placeholder="نام خانوادگی" />
                    </div>
                  </div>
                )}
                <Button className="w-full" onClick={sendOtp} disabled={busy}>
                  {busy ? 'لطفاً صبر کنید...' : 'دریافت کد تایید'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> کد تایید</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="کد ۶ رقمی" dir="ltr" inputMode="numeric" autoFocus />
                </div>
                <Button className="w-full" onClick={verifyOtp} disabled={busy}>
                  {busy ? 'لطفاً صبر کنید...' : 'ورود به حساب'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep('form')} disabled={busy}>تغییر شماره / بازگشت</Button>
              </div>
            )}
          </Tabs>

          <p className="text-xs text-muted-foreground text-center mt-4">
            شناسه یکتای شما کد ملی‌تان است. کد تایید به شماره موبایل ثبت‌شده ارسال می‌شود.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
