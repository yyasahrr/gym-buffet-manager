'use client';

import { useState } from 'react';
import { UserCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppData, dataStore } from '@/lib/store';
import { uid } from '@/lib/utils';

export default function ApplyTrainerPage() {
  const { toast } = useToast();
  const { trainerApplications, account } = useAppData();
  const [gymCode, setGymCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [resume, setResume] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [experience, setExperience] = useState('');

  const submit = () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'خطا', description: 'نام را وارد کنید.' });
      return;
    }
    if (!/^\d{6}$/.test(gymCode) || (account.trainerInviteCode && gymCode !== account.trainerInviteCode)) {
      toast({ variant: 'destructive', title: 'کد نامعتبر', description: 'کد دعوت ۶ رقمی معتبر باشگاه را وارد کنید.' });
      return;
    }
    dataStore.saveData({
      trainerApplications: [
        ...(trainerApplications || []),
        {
          id: uid('app'), name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined, gymCode,
          resume: resume.trim() || undefined, portfolio: portfolio.trim() || undefined, experience: experience.trim() || undefined,
          status: 'pending', createdAt: new Date().toISOString(),
        },
      ],
    });
    toast({ title: 'موفق', description: 'درخواست همکاری شما ثبت شد و پس از بررسی توسط مدیر/مالک به سیستم افزوده خواهید شد.' });
    setName(''); setPhone(''); setEmail(''); setResume(''); setPortfolio(''); setExperience(''); setGymCode('');
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4 py-6">
        <div className="border-b pb-3 mb-1 text-lg font-semibold">درخواست همکاری به عنوان مربی</div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /> درخواست همکاری به عنوان مربی</CardTitle>
            <CardDescription>فرم را پر کنید؛ مدیر یا مالک مشخصات، رزومه و نمونه‌کار شما را بررسی می‌کند و در صورت تایید، شما به عنوان مربی به سیستم و حسابداری افزوده می‌شوید.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>نام و نام خانوادگی</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>تلفن</Label><Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
            <div><Label>کد دعوت ۶ رقمی باشگاه</Label><Input dir="ltr" inputMode="numeric" maxLength={6} value={gymCode} onChange={(e) => setGymCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="کد را از مدیریت باشگاه دریافت کنید" /></div>
            <div><Label>ایمیل</Label><Input dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>رزومه</Label><Textarea value={resume} onChange={(e) => setResume(e.target.value)} placeholder="تحصیلات، مدارک، سابقه تدریس…" /></div>
            <div><Label>نمونه کار / لینک</Label><Textarea value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="اینستاگرام، وب‌سایت، ویدیوهای تمرینی…" /></div>
            <div><Label>سابقه فعالیت</Label><Textarea value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="سال‌های تجربه، رشته‌های تخصصی…" /></div>
            <Button onClick={submit}>ارسال درخواست</Button>
          </CardContent>
        </Card>
        <Link href="/" className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}
