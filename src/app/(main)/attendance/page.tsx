'use client';

import { useMemo, useState } from 'react';
import { Clock, LogIn, LogOut, Users, UserCheck, PlusCircle, Search, QrCode } from 'lucide-react';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData, dataStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import type { Attendance, AttendanceKind, AttendanceMethod } from '@/lib/types';

const methodLabel: Record<AttendanceMethod, string> = { qr: 'QR', code: 'کد', manual: 'دستی', face: 'چهره' };
const kindLabel: Record<AttendanceKind, string> = { member: 'عضو', staff: 'کارمند' };

function nowHHMM(): string {
  return new Date().toTimeString().slice(0, 5);
}

export default function AttendancePage() {
  const appData = useAppData();
  const { attendances, customers, staff } = appData;
  const { toast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(todayStr);
  const [kindFilter, setKindFilter] = useState<'all' | AttendanceKind>('all');
  const [search, setSearch] = useState('');

  // ----- ثبت حضور -----
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AttendanceKind>('member');
  const [personId, setPersonId] = useState('');
  const [method, setMethod] = useState<AttendanceMethod>('manual');
  const [note, setNote] = useState('');

  const members = useMemo(() => (customers || []).filter((c) => c.status === 'active'), [customers]);
  const staffList = useMemo(() => (staff || []).filter((s) => s.status === 'active'), [staff]);
  const personOptions = kind === 'member' ? members : staffList;

  const filtered = useMemo(() => {
    return (attendances || [])
      .filter((a) => a.date === dateFilter)
      .filter((a) => kindFilter === 'all' || a.kind === kindFilter)
      .filter((a) => !search || a.personName.includes(search))
      .slice()
      .sort((a, b) => (b.timeIn || '').localeCompare(a.timeIn || ''));
  }, [attendances, dateFilter, kindFilter, search]);

  const todayTotal = (attendances || []).filter((a) => a.date === todayStr).length;
  const membersToday = (attendances || []).filter((a) => a.date === todayStr && a.kind === 'member').length;
  const staffToday = (attendances || []).filter((a) => a.date === todayStr && a.kind === 'staff').length;
  const insideNow = (attendances || []).filter((a) => a.date === todayStr && !a.timeOut).length;

  const resetDialog = () => {
    setKind('member'); setPersonId(''); setMethod('manual'); setNote('');
  };

  const checkIn = () => {
    const person = personOptions.find((p) => p.id === personId);
    if (!person) { toast({ variant: 'destructive', title: 'خطا', description: 'شخص را انتخاب کنید.' }); return; }
    const record: Attendance = {
      id: uid('att'),
      kind,
      personId: person.id,
      personName: person.name,
      role: kind === 'staff' ? (person as any).role || 'کارمند' : 'عضو',
      date: todayStr,
      timeIn: nowHHMM(),
      method,
      note: note || undefined,
    };
    dataStore.saveData({ attendances: [...(attendances || []), record] });
    setOpen(false); resetDialog();
    toast({ title: 'موفق', description: `ورود ${person.name} ثبت شد.` });
  };

  const checkOut = (a: Attendance) => {
    dataStore.saveData({
      attendances: (attendances || []).map((x) => x.id === a.id ? { ...x, timeOut: nowHHMM() } : x),
    });
    toast({ title: 'موفق', description: `خروج ${a.personName} ثبت شد.` });
  };

  const del = (id: string) => dataStore.saveData({ attendances: (attendances || []).filter((a) => a.id !== id) });

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="حضور و غیاب" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="حضور و غیاب (اعضا و کارکنان)">
          <p className="text-sm text-muted-foreground">ثبت ورود/خروج اعضا و کارکنان با روش‌های مختلف (QR، کد، دستی، چهره).</p>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-4 mb-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">حضور امروز</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{todayTotal.toLocaleString('fa-IR')}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">اعضا</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-primary">{membersToday.toLocaleString('fa-IR')}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">کارکنان</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-primary">{staffToday.toLocaleString('fa-IR')}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">در محل (بدون خروج)</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-600">{insideNow.toLocaleString('fa-IR')}</CardContent></Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle>لیست حضور و غیاب</CardTitle>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetDialog(); }}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="ml-2 h-4 w-4" />ثبت حضور</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>ثبت ورود</DialogTitle></DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>نوع</Label>
                      <Select value={kind} onValueChange={(v) => { setKind(v as AttendanceKind); setPersonId(''); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">عضو</SelectItem>
                          <SelectItem value="staff">کارمند</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>روش</Label>
                      <Select value={method} onValueChange={(v) => setMethod(v as AttendanceMethod)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="qr">QR</SelectItem>
                          <SelectItem value="code">کد</SelectItem>
                          <SelectItem value="manual">دستی</SelectItem>
                          <SelectItem value="face">چهره</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>{kind === 'member' ? 'عضو' : 'کارمند'}</Label>
                    <Select value={personId} onValueChange={setPersonId}>
                      <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                      <SelectContent>
                        {personOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>یادداشت</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
                </div>
                <DialogFooter><Button variant="secondary" onClick={() => { setOpen(false); resetDialog(); }}>لغو</Button><Button onClick={checkIn}>ثبت ورود</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pr-8" placeholder="جستجوی نام…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-[180px]" />
              <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as 'all' | AttendanceKind)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="member">عضو</SelectItem>
                  <SelectItem value="staff">کارمند</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader><TableRow><TableHead>نام</TableHead><TableHead>نوع</TableHead><TableHead>ورود</TableHead><TableHead>خروج</TableHead><TableHead>روش</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">رکوردی برای این تاریخ ثبت نشده است.</TableCell></TableRow>
                ) : filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="flex items-center gap-2"><span className={a.kind === 'member' ? 'text-primary' : 'text-emerald-600'}><UserCheck className="h-4 w-4 inline" /></span> {a.personName}</TableCell>
                    <TableCell><Badge variant="secondary">{kindLabel[a.kind]}</Badge></TableCell>
                    <TableCell className="flex items-center gap-1"><LogIn className="h-3.5 w-3.5 text-green-600" /> {a.timeIn}</TableCell>
                    <TableCell>{a.timeOut ? (<span className="flex items-center gap-1"><LogOut className="h-3.5 w-3.5 text-amber-600" /> {a.timeOut}</span>) : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell><Badge variant="outline"><QrCode className="h-3 w-3 ml-1" />{methodLabel[a.method]}</Badge></TableCell>
                    <TableCell className="space-x-1 space-x-reverse">
                      {!a.timeOut && <Button size="sm" variant="outline" onClick={() => checkOut(a)}>خروج</Button>}
                      <Button size="sm" variant="destructive" onClick={() => del(a.id)}>حذف</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
