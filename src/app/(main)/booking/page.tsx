'use client';

import { useState } from 'react';
import { PlusCircle, CalendarDays, ClipboardList } from 'lucide-react';
import { format as formatJalali } from 'date-fns-jalali';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData, dataStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import type { ClassSession, Booking, BookingStatus } from '@/lib/types';

const dayLabel = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
const bookingStatusLabel: Record<BookingStatus, string> = { booked: 'رزرو شده', cancelled: 'لغو شده', done: 'انجام‌شده' };

export default function BookingPage() {
  const { classSessions, bookings, customers, staff } = useAppData();
  const { toast } = useToast();

  // ----- Classes -----
  const [classOpen, setClassOpen] = useState(false);
  const [cls, setCls] = useState<Partial<ClassSession>>({});
  const saveClass = () => {
    if (!cls.title) { toast({ variant: 'destructive', title: 'خطا', description: 'عنوان کلاس را وارد کنید.' }); return; }
    const list = classSessions || [];
    const payload: Partial<ClassSession> = {
      ...cls,
      dayOfWeek: Number(cls.dayOfWeek ?? 0),
      durationMin: Number(cls.durationMin) || 60,
      capacity: Number(cls.capacity) || 1,
    };
    if (cls.id) {
      dataStore.saveData({ classSessions: list.map((c) => c.id === cls.id ? { ...c, ...payload } as ClassSession : c) });
    } else {
      dataStore.saveData({ classSessions: [...list, { id: uid('cls'), title: payload.title!, trainerId: payload.trainerId, trainerName: payload.trainerName, dayOfWeek: payload.dayOfWeek!, startTime: payload.startTime || '08:00', durationMin: payload.durationMin!, capacity: payload.capacity!, note: payload.note } as ClassSession] });
    }
    setCls({}); setClassOpen(false);
    toast({ title: 'موفق', description: 'کلاس ذخیره شد.' });
  };
  const deleteClass = (id: string) => dataStore.saveData({ classSessions: (classSessions || []).filter((c) => c.id !== id) });

  // ----- Bookings -----
  const [bkOpen, setBkOpen] = useState(false);
  const [bk, setBk] = useState<Partial<Booking>>({});
  const onSessionChange = (sessionId: string) => {
    const c = (classSessions || []).find((x) => x.id === sessionId);
    setBk({ ...bk, sessionId, title: c?.title || bk.title, trainerId: c?.trainerId, trainerName: c?.trainerName, startTime: c?.startTime || bk.startTime, durationMin: c?.durationMin || bk.durationMin });
  };
  const onMemberChange = (memberId: string) => {
    const c = (customers || []).find((x) => x.id === memberId);
    setBk({ ...bk, memberId, memberName: c?.name || bk.memberName || '' });
  };
  const saveBooking = () => {
    if (!bk.memberName || !bk.title || !bk.date) { toast({ variant: 'destructive', title: 'خطا', description: 'مشتری، عنوان و تاریخ را وارد کنید.' }); return; }
    const list = bookings || [];
    const payload: Partial<Booking> = {
      ...bk,
      date: bk.date,
      durationMin: Number(bk.durationMin) || 60,
      fee: bk.fee ? Number(bk.fee) : undefined,
      paid: bk.fee ? Boolean(bk.paid) : false,
      status: (bk.status || 'booked') as BookingStatus,
    };
    if (bk.id) {
      dataStore.saveData({ bookings: list.map((b) => b.id === bk.id ? { ...b, ...payload } as Booking : b) });
    } else {
      dataStore.saveData({ bookings: [...list, { id: uid('bk'), memberId: payload.memberId, memberName: payload.memberName!, sessionId: payload.sessionId, title: payload.title!, trainerId: payload.trainerId, trainerName: payload.trainerName, date: payload.date!, startTime: payload.startTime || '08:00', durationMin: payload.durationMin!, fee: payload.fee, paid: payload.paid, status: payload.status!, note: payload.note } as Booking] });
    }
    setBk({}); setBkOpen(false);
    toast({ title: 'موفق', description: 'رزرو ثبت شد.' });
  };
  const setBkStatus = (b: Booking, status: BookingStatus) => dataStore.saveData({ bookings: (bookings || []).map((x) => x.id === b.id ? { ...x, status } : x) });
  const deleteBooking = (id: string) => dataStore.saveData({ bookings: (bookings || []).filter((b) => b.id !== id) });

  const bookedToday = (bookings || []).filter((b) => b.date === new Date().toISOString().split('T')[0] && b.status === 'booked').length;
  const trainers = (staff || []).filter((s) => s.role === 'trainer');

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="رزرو و کلاس‌ها" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="رزرو کلاس و جلسات مربی (Booking)">
          <p className="text-sm text-muted-foreground">برنامه کلاس‌های هفتگی و رزروهای اعضا — درآمد جلسات پولی روی دفتر باشگاه ثبت می‌شود.</p>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">کلاس‌های تعریف‌شده</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{(classSessions || []).length}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">رزروهای ثبت‌شده</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{(bookings || []).length}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">رزروهای امروز</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-primary">{bookedToday}</CardContent></Card>
        </div>

        <Tabs defaultValue="classes">
          <TabsList className="mb-4">
            <TabsTrigger value="classes"><CalendarDays className="ml-1 h-4 w-4" />کلاس‌های هفتگی</TabsTrigger>
            <TabsTrigger value="bookings"><ClipboardList className="ml-1 h-4 w-4" />رزروها</TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>برنامه کلاس‌ها</CardTitle>
                <Dialog open={classOpen} onOpenChange={setClassOpen}>
                  <DialogTrigger asChild><Button><PlusCircle className="ml-2 h-4 w-4" />افزودن کلاس</Button></DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>افزودن/ویرایش کلاس</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div><Label>عنوان کلاس</Label><Input value={cls.title || ''} onChange={(e) => setCls({ ...cls, title: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>مربی</Label>
                          <Select value={cls.trainerId || ''} onValueChange={(v) => { const t = trainers.find((x) => x.id === v); setCls({ ...cls, trainerId: v, trainerName: t?.name }); }}>
                            <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                            <SelectContent>{(staff || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.role === 'trainer' ? 'مربی' : 'سایر'})</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label>روز هفته</Label>
                          <Select value={String(cls.dayOfWeek ?? 0)} onValueChange={(v) => setCls({ ...cls, dayOfWeek: Number(v) })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{dayLabel.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div><Label>ساعت شروع</Label><Input type="time" value={cls.startTime || '08:00'} onChange={(e) => setCls({ ...cls, startTime: e.target.value })} /></div>
                        <div><Label>مدت (دقیقه)</Label><Input type="number" value={cls.durationMin || 60} onChange={(e) => setCls({ ...cls, durationMin: Number(e.target.value) })} /></div>
                        <div><Label>ظرفیت</Label><Input type="number" value={cls.capacity || 1} onChange={(e) => setCls({ ...cls, capacity: Number(e.target.value) })} /></div>
                      </div>
                      <div><Label>یادداشت</Label><Textarea value={cls.note || ''} onChange={(e) => setCls({ ...cls, note: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button variant="secondary" onClick={() => { setCls({}); setClassOpen(false); }}>لغو</Button><Button onClick={saveClass}>ذخیره</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>روز</TableHead><TableHead>ساعت</TableHead><TableHead>عنوان</TableHead><TableHead>مربی</TableHead><TableHead>ظرفیت</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(classSessions || []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کلاسی تعریف نشده است.</TableCell></TableRow> :
                      (classSessions || []).slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{dayLabel[c.dayOfWeek]}</TableCell>
                          <TableCell>{c.startTime}</TableCell>
                          <TableCell>{c.title}</TableCell>
                          <TableCell>{c.trainerName || '—'}</TableCell>
                          <TableCell>{c.capacity} نفر</TableCell>
                          <TableCell className="space-x-2 space-x-reverse">
                            <Button size="sm" variant="outline" onClick={() => { setCls(c); setClassOpen(true); }}>ویرایش</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteClass(c.id)}>حذف</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>رزروهای اعضا</CardTitle>
                <Dialog open={bkOpen} onOpenChange={setBkOpen}>
                  <DialogTrigger asChild><Button><PlusCircle className="ml-2 h-4 w-4" />ثبت رزرو</Button></DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>ثبت/ویرایش رزرو</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div><Label>مشتری</Label>
                        <Select value={bk.memberId || ''} onValueChange={onMemberChange}>
                          <SelectTrigger><SelectValue placeholder="انتخاب عضو" /></SelectTrigger>
                          <SelectContent>{(customers || []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>کلاس (اختیاری)</Label>
                        <Select value={bk.sessionId || ''} onValueChange={onSessionChange}>
                          <SelectTrigger><SelectValue placeholder="انتخاب کلاس" /></SelectTrigger>
                          <SelectContent>{(classSessions || []).map((c) => <SelectItem key={c.id} value={c.id}>{c.title} — {dayLabel[c.dayOfWeek]} {c.startTime}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>عنوان جلسه</Label><Input value={bk.title || ''} onChange={(e) => setBk({ ...bk, title: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>تاریخ</Label><Input type="date" value={bk.date || ''} onChange={(e) => setBk({ ...bk, date: e.target.value })} /></div>
                        <div><Label>ساعت</Label><Input type="time" value={bk.startTime || '08:00'} onChange={(e) => setBk({ ...bk, startTime: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>مدت (دقیقه)</Label><Input type="number" value={bk.durationMin || 60} onChange={(e) => setBk({ ...bk, durationMin: Number(e.target.value) })} /></div>
                        <div><Label>مربی</Label>
                          <Select value={bk.trainerId || ''} onValueChange={(v) => { const t = (staff || []).find((x) => x.id === v); setBk({ ...bk, trainerId: v, trainerName: t?.name }); }}>
                            <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                            <SelectContent>{(staff || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>هزینه جلسه (تومان)</Label><Input type="number" value={bk.fee || ''} onChange={(e) => setBk({ ...bk, fee: Number(e.target.value) })} /></div>
                        <div><Label>وضعیت پرداخت</Label>
                          <Select value={bk.paid ? 'paid' : 'unpaid'} onValueChange={(v) => setBk({ ...bk, paid: v === 'paid' })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="unpaid">پرداخت‌نشده</SelectItem><SelectItem value="paid">پرداخت‌شده</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><Label>یادداشت</Label><Textarea value={bk.note || ''} onChange={(e) => setBk({ ...bk, note: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button variant="secondary" onClick={() => { setBk({}); setBkOpen(false); }}>لغو</Button><Button onClick={saveBooking}>ذخیره</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>تاریخ</TableHead><TableHead>ساعت</TableHead><TableHead>عضو</TableHead><TableHead>عنوان</TableHead><TableHead>مربی</TableHead><TableHead>هزینه</TableHead><TableHead>وضعیت</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(bookings || []).length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">رزروی ثبت نشده است.</TableCell></TableRow> :
                      (bookings || []).slice().sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)).map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.date}</TableCell>
                          <TableCell>{b.startTime}</TableCell>
                          <TableCell>{b.memberName}</TableCell>
                          <TableCell>{b.title}</TableCell>
                          <TableCell>{b.trainerName || '—'}</TableCell>
                          <TableCell>{b.fee ? `${b.fee.toLocaleString('fa-IR')}${b.paid ? '' : ' (پرداخت‌نشده)'}` : '—'}</TableCell>
                          <TableCell><Badge variant={b.status === 'done' ? 'default' : b.status === 'cancelled' ? 'outline' : 'secondary'}>{bookingStatusLabel[b.status]}</Badge></TableCell>
                          <TableCell className="space-x-1 space-x-reverse">
                            {b.status === 'booked' && <Button size="sm" variant="outline" onClick={() => setBkStatus(b, 'done')}>انجام</Button>}
                            {b.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => setBkStatus(b, 'cancelled')}>لغو</Button>}
                            <Button size="sm" variant="destructive" onClick={() => deleteBooking(b.id)}>حذف</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
