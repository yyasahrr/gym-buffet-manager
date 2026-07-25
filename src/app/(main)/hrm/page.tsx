'use client';

import { useState } from 'react';
import { PlusCircle, Users, Wallet } from 'lucide-react';
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
import Link from 'next/link';
import { useAppData, dataStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import type { Staff, PayrollRecord, StaffRole, EmploymentType } from '@/lib/types';

const roleLabel: Record<StaffRole, string> = { trainer: 'مربی', reception: 'پذیرش', cleaner: 'خدمات', manager: 'مدیر', other: 'سایر' };
const empLabel: Record<EmploymentType, string> = { fulltime: 'تمام‌وقت', parttime: 'پاره‌وقت', contract: 'قراردادی' };

function jalali(iso: string, fmt = 'yyyy/MM/dd') {
  try { return formatJalali(new Date(iso), fmt); } catch { return iso; }
}

export default function HRMPage() {
  const { staff, payrolls } = useAppData();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Staff>>({});

  const saveStaff = () => {
    if (!form.name) { toast({ variant: 'destructive', title: 'خطا', description: 'نام را وارد کنید.' }); return; }
    const list = staff || [];
    const payload: Partial<Staff> = {
      ...form,
      monthlySalary: Number(form.monthlySalary) || 0,
      hireDate: form.hireDate ? new Date(form.hireDate).toISOString() : new Date().toISOString(),
      role: (form.role || 'other') as StaffRole,
      employmentType: (form.employmentType || 'fulltime') as EmploymentType,
      status: (form.status || 'active') as 'active' | 'inactive',
      branch: form.branch,
      privateRate: form.privateRate ? Number(form.privateRate) : undefined,
      bio: form.bio,
      specialties: form.specialties,
    };
    if (form.id) {
      dataStore.saveData({ staff: list.map((s) => s.id === form.id ? { ...s, ...payload } as Staff : s) });
    } else {
      dataStore.saveData({ staff: [...list, { id: uid('staff'), name: payload.name!, role: payload.role!, employmentType: payload.employmentType!, phone: payload.phone, nationalId: payload.nationalId, monthlySalary: payload.monthlySalary!, hireDate: payload.hireDate!, status: payload.status!, note: payload.note } as Staff] });
    }
    setForm({}); setOpen(false);
    toast({ title: 'موفق', description: 'کارمند ذخیره شد.' });
  };
  const deleteStaff = (id: string) => dataStore.saveData({ staff: (staff || []).filter((s) => s.id !== id) });

  const periodLabel = formatJalali(new Date(), 'yyyy/MM');
  const generatePayroll = () => {
    const active = (staff || []).filter((s) => s.status === 'active');
    const existing = new Set((payrolls || []).filter((p) => p.periodLabel === periodLabel).map((p) => p.staffId));
    const created: PayrollRecord[] = active.filter((s) => !existing.has(s.id)).map((s) => ({
      id: uid('pay'), staffId: s.id, staffName: s.name, periodLabel, amount: s.monthlySalary, issueDate: new Date().toISOString(), status: 'unpaid' as const,
    }));
    if (created.length === 0) { toast({ title: 'اطلاع', description: 'حقوق این ماه قبلاً صادر شده است.' }); return; }
    dataStore.saveData({ payrolls: [...(payrolls || []), ...created] });
    toast({ title: 'موفق', description: `${created.length} فیش حقوقی صادر شد.` });
  };
  const payPayroll = (p: PayrollRecord) => dataStore.saveData({ payrolls: (payrolls || []).map((x) => x.id === p.id ? { ...x, status: 'paid' as const, paidDate: new Date().toISOString() } : x) });
  const deletePayroll = (id: string) => dataStore.saveData({ payrolls: (payrolls || []).filter((p) => p.id !== id) });

  const activeCount = (staff || []).filter((s) => s.status === 'active').length;
  const monthlyTotal = (staff || []).filter((s) => s.status === 'active').reduce((s, x) => s + x.monthlySalary, 0);
  const paidMonth = (payrolls || []).filter((p) => p.periodLabel === periodLabel && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const unpaidMonth = (payrolls || []).filter((p) => p.periodLabel === periodLabel && p.status === 'unpaid').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="منابع انسانی" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="منابع انسانی و حقوق (HRM)">
          <p className="text-sm text-muted-foreground">مربیان و کارکنان باشگاه و پرداخت حقوق — هزینه‌ای متعلق به دفتر باشگاه.</p>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-4 mb-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">کارکنان فعال</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{activeCount} نفر</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">حقوق ماهانه</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{monthlyTotal.toLocaleString('fa-IR')} تومان</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">پرداخت‌شده ({periodLabel})</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-green-600">{paidMonth.toLocaleString('fa-IR')}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">پرداخت‌نشده ({periodLabel})</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-600">{unpaidMonth.toLocaleString('fa-IR')}</CardContent></Card>
        </div>

        <Tabs defaultValue="staff">
          <TabsList className="mb-4">
            <TabsTrigger value="staff"><Users className="ml-1 h-4 w-4" />کارکنان و مربیان</TabsTrigger>
            <TabsTrigger value="payroll"><Wallet className="ml-1 h-4 w-4" />حقوق‌داری</TabsTrigger>
          </TabsList>

          <TabsContent value="staff">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>لیست کارکنان</CardTitle>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild><Button><PlusCircle className="ml-2 h-4 w-4" />افزودن کارمند</Button></DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>افزودن/ویرایش کارمند</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>نام</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                        <div><Label>نقش</Label>
                          <Select value={form.role || 'other'} onValueChange={(v) => setForm({ ...form, role: v as StaffRole })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(roleLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>نوع استخدام</Label>
                          <Select value={form.employmentType || 'fulltime'} onValueChange={(v) => setForm({ ...form, employmentType: v as EmploymentType })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(empLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label>حقوق ماهانه</Label><Input type="number" value={form.monthlySalary || ''} onChange={(e) => setForm({ ...form, monthlySalary: Number(e.target.value) })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>تلفن</Label><Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                        <div><Label>کد ملی</Label><Input value={form.nationalId || ''} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>تاریخ استخدام</Label><Input type="date" value={form.hireDate ? form.hireDate.split('T')[0] : ''} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></div>
                        <div><Label>وضعیت</Label>
                          <Select value={form.status || 'active'} onValueChange={(v) => setForm({ ...form, status: v as 'active' | 'inactive' })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="active">فعال</SelectItem><SelectItem value="inactive">غیرفعال</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>مجموعه / شعبه</Label><Input value={form.branch || ''} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="مثال: شعبه مرکزی" /></div>
                        <div><Label>شهریه خصوصی (تومان)</Label><Input type="number" value={form.privateRate || ''} onChange={(e) => setForm({ ...form, privateRate: Number(e.target.value) })} placeholder="هزینه جلسه خصوصی" /></div>
                      </div>
                      <div><Label>تخصص‌ها (با ویرگول جدا شود)</Label><Input value={(form.specialties || []).join('، ')} onChange={(e) => setForm({ ...form, specialties: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })} placeholder="مثال: بدنسازی، یوگا، کراسفیت" /></div>
                      <div><Label>رزومه / بیو</Label><Textarea value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="سابقه، مدارک و توضیحات مربی" /></div>
                      <div><Label>یادداشت</Label><Textarea value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button variant="secondary" onClick={() => { setForm({}); setOpen(false); }}>لغو</Button><Button onClick={saveStaff}>ذخیره</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>نام</TableHead><TableHead>نقش</TableHead><TableHead>تخصص‌ها</TableHead><TableHead>شهریه خصوصی</TableHead><TableHead>وضعیت</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(staff || []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کارمندی ثبت نشده است.</TableCell></TableRow> :
                      (staff || []).map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.name}{s.branch ? <span className="block text-xs text-muted-foreground">{s.branch}</span> : null}</TableCell>
                          <TableCell><Badge variant="secondary">{roleLabel[s.role]}</Badge></TableCell>
                          <TableCell>{(s.specialties || []).map((sp) => <Badge key={sp} variant="outline" className="ml-1">{sp}</Badge>)}</TableCell>
                          <TableCell>{s.privateRate ? `${s.privateRate.toLocaleString('fa-IR')} تومان` : '—'}</TableCell>
                          <TableCell><Badge variant={s.status === 'active' ? 'default' : 'outline'}>{s.status === 'active' ? 'فعال' : 'غیرفعال'}</Badge></TableCell>
                          <TableCell className="space-x-2 space-x-reverse">
                            <Link href={`/trainers/${s.id}`}><Button size="sm" variant="outline">پروفایل</Button></Link>
                            <Button size="sm" variant="outline" onClick={() => { setForm(s); setOpen(true); }}>ویرایش</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteStaff(s.id)}>حذف</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>فیش‌های حقوقی</CardTitle>
                <Button onClick={generatePayroll}><Wallet className="ml-2 h-4 w-4" />صدور حقوق ماه {periodLabel}</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>دوره</TableHead><TableHead>کارمند</TableHead><TableHead>مبلغ</TableHead><TableHead>تاریخ پرداخت</TableHead><TableHead>وضعیت</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(payrolls || []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">فیش حقوقی صادر نشده است.</TableCell></TableRow> :
                      (payrolls || []).slice().sort((a, b) => b.periodLabel.localeCompare(a.periodLabel)).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.periodLabel}</TableCell>
                          <TableCell>{p.staffName}</TableCell>
                          <TableCell>{p.amount.toLocaleString('fa-IR')} تومان</TableCell>
                          <TableCell>{p.paidDate ? jalali(p.paidDate) : '—'}</TableCell>
                          <TableCell><Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده'}</Badge></TableCell>
                          <TableCell className="space-x-2 space-x-reverse">
                            {p.status !== 'paid' && <Button size="sm" variant="outline" onClick={() => payPayroll(p)}>پرداخت</Button>}
                            <Button size="sm" variant="destructive" onClick={() => deletePayroll(p.id)}>حذف</Button>
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
