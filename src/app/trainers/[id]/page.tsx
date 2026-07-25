'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format as formatJalali } from 'date-fns-jalali';
import { Dumbbell, Clock, ArrowRight, CalendarRange, Phone, User, CalendarPlus } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppData, dataStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trainerActivity, trainerBusyHours, activityLevel, levelClass, initials, avatarColor } from '@/lib/trainer';
import type { Booking } from '@/lib/types';

const dayLabel = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // ۸ تا ۲۱

// تبدیل dayOfWeek (۰=شنبه) به نزدیک‌ترین تاریخ آینده (شامل امروز)
function nextDateForWeekday(dayOfWeek: number, from = new Date()): string {
  const targetGetDay = (dayOfWeek + 6) % 7; // شنبه(۰) -> 6 (یکشنبه=0 ... شنبه=6)
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  let guard = 0;
  while (d.getDay() !== targetGetDay && guard < 14) {
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return d.toISOString().split('T')[0];
}

export default function TrainerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { staff, bookings, classSessions } = useAppData();
  const { toast } = useToast();
  const trainerId = String(id);
  const trainer = (staff || []).find((s) => s.id === trainerId);

  const activity = useMemo(
    () => (trainer ? trainerActivity(trainer.id, bookings || [], classSessions || []) : []),
    [trainer, bookings, classSessions]
  );
  const busy = useMemo(
    () => (trainer ? trainerBusyHours(trainer.id, classSessions || [], bookings || []) : {}),
    [trainer, classSessions, bookings]
  );

  const upcomingBookings = trainer
    ? (bookings || []).filter(
        (b) => b.trainerId === trainerId && b.status === 'booked' && b.date >= new Date().toISOString().split('T')[0]
      ).length
    : 0;

  // ----- رزرو جلسه خصوصی (مشتری‌محور، لوکال‌فرست) -----
  const [bookOpen, setBookOpen] = useState(false);
  const [bName, setBName] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [bDate, setBDate] = useState('');
  const [bTime, setBTime] = useState('');

  const openBook = (dayOfWeek?: number, hour?: number) => {
    if (!trainer) return;
    const referenceDay = dayOfWeek ?? 1;
    const firstFree = HOURS.find((h) => !(busy[referenceDay] || []).includes(h)) ?? 9;
    setBName('');
    setBPhone('');
    setBDate(dayOfWeek != null ? nextDateForWeekday(dayOfWeek) : nextDateForWeekday(referenceDay));
    setBTime(hour != null ? `${hour}:00` : `${firstFree}:00`);
    setBookOpen(true);
  };

  const submitBooking = () => {
    if (!trainer) return;
    if (!bName.trim() || !bDate || !bTime) {
      toast({ variant: 'destructive', title: 'خطا', description: 'نام، تاریخ و ساعت را وارد کنید.' });
      return;
    }
    const fee = trainer.privateRate && trainer.privateRate > 0 ? trainer.privateRate : undefined;
    const note = bPhone ? `تماس: ${bPhone}` : '';
    const record: Booking = {
      id: uid('bk'),
      memberName: bName.trim(),
      title: `جلسه خصوصی — ${trainer.name}`,
      trainerId: trainer.id,
      trainerName: trainer.name,
      date: bDate,
      startTime: bTime,
      durationMin: 60,
      fee,
      paid: fee ? true : false, // پرداخت آزمایشی (mock) روی لوکال — بدون درگاه واقعی
      status: 'booked',
      note,
    };
    dataStore.saveData({ bookings: [...(bookings || []), record] });
    setBookOpen(false);
    toast({
      title: 'درخواست رزرو ثبت شد',
      description: fee
        ? `جلسه خصوصی با ${trainer.name} برای ${bDate} ساعت ${bTime} رزرو و پرداخت (آزمایشی) شد.`
        : `جلسه خصوصی با ${trainer.name} برای ${bDate} ساعت ${bTime} ثبت شد (توافقی).`,
    });
  };

  if (!trainer) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-8 flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">مربی مورد نظر یافت نشد.</p>
          <Link href="/trainers"><Button variant="outline">بازگشت به فهرست مربیان</Button></Link>
        </div>
      </div>
    );
  }

  const weeks = Math.ceil(activity.length / 7);
  const grid = Array.from({ length: weeks }, (_, w) => activity.slice(w * 7, w * 7 + 7));
  const totalSessions = activity.reduce((s, d) => s + d.count, 0);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/trainers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> فهرست مربیان
        </Link>

        {/* هدر پروفایل */}
        <Card>
          <CardContent className="p-6 flex flex-col sm:flex-row gap-5 items-start">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0 ${avatarColor(trainer.name)}`}>
              {initials(trainer.name)}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{trainer.name}</h1>
                <Badge variant="secondary">{trainer.branch || 'باشگاه'}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {(trainer.specialties || []).map((sp) => <Badge key={sp} variant="outline">{sp}</Badge>)}
              </div>
              <p className="text-sm text-muted-foreground">{trainer.bio || 'رزومه‌ای ثبت نشده است.'}</p>
            </div>
            <div className="text-center sm:text-left space-y-1 shrink-0">
              <p className="text-xs text-muted-foreground">شهریه جلسه خصوصی</p>
              <p className="text-xl font-bold text-primary">
                {trainer.privateRate ? `${trainer.privateRate.toLocaleString('fa-IR')} تومان` : 'توافقی'}
              </p>
              <Button size="sm" className="mt-1" onClick={() => openBook()}>
                <CalendarPlus className="ml-1 h-4 w-4" /> رزرو جلسه خصوصی
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* آمار سریع */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">کل جلسات (یک سال)</p>
            <p className="text-xl font-bold">{totalSessions.toLocaleString('fa-IR')}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">رزروهای آینده</p>
            <p className="text-xl font-bold text-primary">{upcomingBookings.toLocaleString('fa-IR')}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">شهریه خصوصی</p>
            <p className="text-xl font-bold">{trainer.privateRate ? `${trainer.privateRate.toLocaleString('fa-IR')}` : 'توافقی'}</p>
          </CardContent></Card>
        </div>

        {/* فعالیت به سبک گیت‌هاب */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5" /> فعالیت مربی</CardTitle>
            <CardDescription>
              تعداد جلسات برگزارشده در هر روز طی یک سال گذشته — {totalSessions.toLocaleString('fa-IR')} جلسه.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto" dir="ltr">
              <div className="flex gap-[3px]">
                {grid.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {week.map((day, di) => {
                      const lvl = activityLevel(day.count);
                      return (
                        <div
                          key={di}
                          title={`${formatJalali(day.date, 'yyyy/MM/dd')} — ${day.count} جلسه`}
                          className={`w-[11px] h-[11px] rounded-[2px] ${levelClass[lvl]}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground" dir="rtl">
              <span>کم</span>
              {[0, 1, 2, 3, 4].map((l) => <div key={l} className={`w-[11px] h-[11px] rounded-[2px] ${levelClass[l]}`} />)}
              <span>زیاد</span>
            </div>
          </CardContent>
        </Card>

        {/* بورد آزاد/بسته */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> زمان‌های آزاد و بسته (هفتگی)</CardTitle>
            <CardDescription>
              سلول‌های سبز زمان آزاد و سلول‌های کهربایی زمان اشغال مربی هستند. روی هر خانهٔ سبز کلیک کنید تا رزرو شود.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-center text-xs border-separate" style={{ borderSpacing: '2px' }}>
              <thead>
                <tr>
                  <th className="p-1 text-muted-foreground font-normal">ساعت</th>
                  {dayLabel.map((d) => <th key={d} className="p-1 text-muted-foreground font-normal whitespace-nowrap">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((h) => (
                  <tr key={h}>
                    <td className="p-1 text-muted-foreground whitespace-nowrap">{`${h}:00`}</td>
                    {dayLabel.map((_, di) => {
                      const isBusy = (busy[di] || []).includes(h);
                      return isBusy ? (
                        <td
                          key={di}
                          title={`${dayLabel[di]} ${h}:00 — اشغال`}
                          className="p-1 rounded bg-amber-300"
                        >
                          ●
                        </td>
                      ) : (
                        <td
                          key={di}
                          title={`${dayLabel[di]} ${h}:00 — آزاد (کلیک کنید تا رزرو شود)`}
                          onClick={() => openBook(di, h)}
                          className="p-1 rounded bg-green-100 hover:bg-green-300 cursor-pointer transition-colors"
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          این صفحه به‌صورت عمومی و برای نمایش به مشتریان طراحی شده است.
        </p>
      </div>

      {/* دیالوگ رزرو جلسه خصوصی */}
      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarRange className="h-5 w-5" /> رزرو جلسه خصوصی با {trainer.name}</DialogTitle>
            <DialogDescription>
              زمان مورد نظر را انتخاب کنید. ثبت رزرو روی لوکال انجام می‌شود و پرداخت به‌صورت آزمایشی (mock) است — بدون نیاز به درگاه/کلید.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div><Label>نام و نام خانوادگی</Label><Input value={bName} onChange={(e) => setBName(e.target.value)} placeholder="مثال: علی رضایی" /></div>
            <div><Label>تلفن تماس (اختیاری)</Label><Input dir="ltr" value={bPhone} onChange={(e) => setBPhone(e.target.value)} placeholder="09..." /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>تاریخ</Label><Input type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} /></div>
              <div><Label>ساعت</Label><Input type="time" value={bTime} onChange={(e) => setBTime(e.target.value)} /></div>
            </div>
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>شهریه جلسه خصوصی: <span className="font-semibold">{trainer.privateRate ? `${trainer.privateRate.toLocaleString('fa-IR')} تومان` : 'توافقی'}</span></p>
              {trainer.privateRate ? (
                <p className="text-xs text-muted-foreground">پس از ثبت، مبلغ به‌صورت آزمایشی (بدون درگاه واقعی) پرداخت‌شده ثبت می‌شود. برای اتصال به زرین‌پال/آیدی‌پی کافیست تنظیمات درگاه را فعال کنید.</p>
              ) : (
                <p className="text-xs text-muted-foreground">مبلغ جلسه توافقی است و پس از ثبت با مربی هماهنگ می‌شود.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBookOpen(false)}>لغو</Button>
            <Button onClick={submitBooking}><CalendarPlus className="ml-1 h-4 w-4" /> ثبت رزرو و پرداخت (آزمایشی)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
