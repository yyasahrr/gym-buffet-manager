'use client';

import { useState } from 'react';
import { PlusCircle, Building2, Users, FileText, Receipt } from 'lucide-react';
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
import { getLeasedBuffets } from '@/lib/metrics';
import type { Space, Tenant, Lease, RentInvoice, SpaceType, LeaseStatus } from '@/lib/types';

const spaceTypeLabel: Record<SpaceType, string> = {
  buffet: 'بوفه', court: 'زمین/کورت', hall: 'سالن', studio: 'استودیو',
  parking: 'پارکینگ', locker: 'کمد', adspace: 'فضای تبلیغاتی', other: 'سایر',
};
const leaseStatusLabel: Record<LeaseStatus, string> = { active: 'فعال', expired: 'منقضی‌شده', terminated: 'فسخ‌شده' };
const rentStatusLabel: Record<string, string> = { paid: 'پرداخت‌شده', unpaid: 'پرداخت‌نشده', overdue: 'سررسید گذشته' };

function jalali(iso: string, fmt = 'yyyy/MM/dd') {
  try { return formatJalali(new Date(iso), fmt); } catch { return iso; }
}
function effectiveLeaseStatus(l: Lease): LeaseStatus {
  if (l.status !== 'active') return l.status;
  if (new Date(l.endDate).getTime() < Date.now()) return 'expired';
  return 'active';
}
function effectiveRentStatus(r: RentInvoice): 'paid' | 'unpaid' | 'overdue' {
  if (r.status === 'paid') return 'paid';
  if (new Date(r.dueDate).getTime() < Date.now()) return 'overdue';
  return 'unpaid';
}

export default function RentalPage() {
  const appData = useAppData();
  const { spaces, tenants, leases, rentInvoices } = appData;
  const { toast } = useToast();
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);
  const [leaseOpen, setLeaseOpen] = useState(false);
  const [space, setSpace] = useState<Partial<Space>>({});
  const [tenant, setTenant] = useState<Partial<Tenant>>({});
  const [lease, setLease] = useState<Partial<Lease>>({});

  // ----- Spaces -----
  const saveSpace = () => {
    if (!space.name) { toast({ variant: 'destructive', title: 'خطا', description: 'نام فضا را وارد کنید.' }); return; }
    const list = spaces || [];
    if (space.id) {
      dataStore.saveData({ spaces: list.map((s) => s.id === space.id ? { ...s, ...space } as Space : s) });
    } else {
      dataStore.saveData({ spaces: [...list, { id: uid('space'), name: space.name, type: (space.type || 'other') as SpaceType, area: space.area, description: space.description, status: 'active' } as Space] });
    }
    setSpace({}); setSpaceOpen(false);
    toast({ title: 'موفق', description: 'فضا ذخیره شد.' });
  };
  const deleteSpace = (id: string) => dataStore.saveData({ spaces: (spaces || []).filter((s) => s.id !== id) });

  // ----- Tenants -----
  const saveTenant = () => {
    if (!tenant.name) { toast({ variant: 'destructive', title: 'خطا', description: 'نام مستأجر را وارد کنید.' }); return; }
    const list = tenants || [];
    if (tenant.id) {
      dataStore.saveData({ tenants: list.map((t) => t.id === tenant.id ? { ...t, ...tenant } as Tenant : t) });
    } else {
      dataStore.saveData({ tenants: [...list, { id: uid('tenant'), name: tenant.name, contact: tenant.contact, phone: tenant.phone, email: tenant.email, note: tenant.note, status: 'active' } as Tenant] });
    }
    setTenant({}); setTenantOpen(false);
    toast({ title: 'موفق', description: 'مستأجر ذخیره شد.' });
  };
  const deleteTenant = (id: string) => dataStore.saveData({ tenants: (tenants || []).filter((t) => t.id !== id) });

  // ----- Leases -----
  const saveLease = () => {
    if (!lease.tenantId || !lease.spaceId || !lease.monthlyRent) { toast({ variant: 'destructive', title: 'خطا', description: 'مستأجر، فضا و مبلغ اجاره را وارد کنید.' }); return; }
    const list = leases || [];
    const payload: Partial<Lease> = {
      ...lease,
      startDate: lease.startDate ? new Date(lease.startDate).toISOString() : new Date().toISOString(),
      endDate: lease.endDate ? new Date(lease.endDate).toISOString() : new Date().toISOString(),
      monthlyRent: Number(lease.monthlyRent) || 0,
      deposit: lease.deposit ? Number(lease.deposit) : undefined,
      billingDay: Number(lease.billingDay) || 1,
      escalationPct: lease.escalationPct ? Number(lease.escalationPct) : undefined,
      status: (lease.status || 'active') as LeaseStatus,
    };
    if (lease.id) {
      dataStore.saveData({ leases: list.map((l) => l.id === lease.id ? { ...l, ...payload } as Lease : l) });
    } else {
      dataStore.saveData({ leases: [...list, { id: uid('lease'), tenantId: payload.tenantId!, spaceId: payload.spaceId!, startDate: payload.startDate!, endDate: payload.endDate!, monthlyRent: payload.monthlyRent, deposit: payload.deposit, billingDay: payload.billingDay!, escalationPct: payload.escalationPct, note: payload.note, status: payload.status! } as Lease] });
    }
    setLease({}); setLeaseOpen(false);
    toast({ title: 'موفق', description: 'قرارداد اجاره ذخیره شد.' });
  };
  const deleteLease = (id: string) => dataStore.saveData({ leases: (leases || []).filter((l) => l.id !== id) });

  // ----- Rent invoices -----
  const periodLabel = formatJalali(new Date(), 'yyyy/MM');
  const generateInvoices = () => {
    const active = (leases || []).filter((l) => effectiveLeaseStatus(l) === 'active');
    const existing = new Set((rentInvoices || []).map((r) => `${r.leaseId}:${r.periodLabel}`));
    const created: RentInvoice[] = [];
    active.forEach((l) => {
      const key = `${l.id}:${periodLabel}`;
      if (existing.has(key)) return;
      const now = new Date();
      const due = new Date(now.getFullYear(), now.getMonth(), Math.min(l.billingDay, 28));
      created.push({
        id: uid('rinv'), leaseId: l.id, tenantId: l.tenantId, spaceId: l.spaceId,
        periodLabel, dueDate: due.toISOString(), amount: l.monthlyRent, status: 'unpaid',
      });
    });
    if (created.length === 0) { toast({ title: 'اطلاع', description: 'صورتحساب جدیدی برای این ماه وجود ندارد.' }); return; }
    dataStore.saveData({ rentInvoices: [...(rentInvoices || []), ...created] });
    toast({ title: 'موفق', description: `${created.length} صورتحساب اجاره صادر شد.` });
  };
  const payInvoice = (r: RentInvoice) => dataStore.saveData({ rentInvoices: (rentInvoices || []).map((x) => x.id === r.id ? { ...x, status: 'paid' as const, paidDate: new Date().toISOString() } : x) });
  const deleteInvoice = (id: string) => dataStore.saveData({ rentInvoices: (rentInvoices || []).filter((r) => r.id !== id) });

  const spaceName = (id?: string) => (spaces || []).find((s) => s.id === id)?.name || '—';
  const tenantName = (id?: string) => (tenants || []).find((t) => t.id === id)?.name || '—';

  // summary
  const dueMonth = (rentInvoices || []).filter((r) => r.periodLabel === periodLabel);
  const dueTotal = dueMonth.reduce((s, r) => s + r.amount, 0);
  const paidTotal = (rentInvoices || []).filter((r) => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const overdueTotal = (rentInvoices || []).filter((r) => effectiveRentStatus(r) === 'overdue').reduce((s, r) => s + r.amount, 0);

  const leasedBuffets = getLeasedBuffets(appData);

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="اجاره‌داری" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="اجاره‌داری (فضاها و مستأجران)">
          <p className="text-sm text-muted-foreground">درآمد اجاره روی دفتر باشگاه ثبت می‌شود. نکته مهم: اگر فضای «بوفه» به مستأجر ثالث اجاره داده شود، درآمد عملیاتی آن بوفه متعلق به مستأجر است و نباید در تراز باشگاه لحاظ شود.</p>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">سررسید امسال ({periodLabel})</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{dueTotal.toLocaleString('fa-IR')} تومان</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">وصولی کل</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-green-600">{paidTotal.toLocaleString('fa-IR')} تومان</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">سررسید گذشته</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-600">{overdueTotal.toLocaleString('fa-IR')} تومان</CardContent></Card>
        </div>

        {leasedBuffets.length > 0 && (
          <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-50 p-4 text-sm">
            <p className="font-semibold text-amber-700 mb-1">بوفه‌های اجاره‌داده‌شده به مستأجر</p>
            <ul className="space-y-1 text-amber-800">
              {leasedBuffets.map((lb) => (
                <li key={lb.space.id}>
                  فضای «{lb.space.name}» در حال حاضر به <b>{lb.tenant.name}</b> اجاره داده شده است؛
                  درآمد عملیاتی این بوفه متعلق به مستأجر است و نباید در تراز باشگاه محاسبه شود.
                </li>
              ))}
            </ul>
          </div>
        )}

        <Tabs defaultValue="spaces">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="spaces"><Building2 className="ml-1 h-4 w-4" />فضاها</TabsTrigger>
            <TabsTrigger value="tenants"><Users className="ml-1 h-4 w-4" />مستأجران</TabsTrigger>
            <TabsTrigger value="leases"><FileText className="ml-1 h-4 w-4" />قراردادها</TabsTrigger>
            <TabsTrigger value="invoices"><Receipt className="ml-1 h-4 w-4" />صورتحساب‌ها</TabsTrigger>
          </TabsList>

          {/* Spaces */}
          <TabsContent value="spaces">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>لیست فضاهای قابل اجاره</CardTitle>
                <Dialog open={spaceOpen} onOpenChange={setSpaceOpen}>
                  <DialogTrigger asChild><Button><PlusCircle className="ml-2 h-4 w-4" />افزودن فضا</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>افزودن/ویرایش فضا</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div><Label>نام فضا</Label><Input value={space.name || ''} onChange={(e) => setSpace({ ...space, name: e.target.value })} placeholder="مثال: بوفه مرکزی" /></div>
                      <div><Label>نوع</Label>
                        <Select value={space.type || 'other'} onValueChange={(v) => setSpace({ ...space, type: v as SpaceType })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(spaceTypeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>مساحت (متر مربع)</Label><Input type="number" value={space.area || ''} onChange={(e) => setSpace({ ...space, area: Number(e.target.value) || undefined })} /></div>
                      <div><Label>توضیحات</Label><Textarea value={space.description || ''} onChange={(e) => setSpace({ ...space, description: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button variant="secondary" onClick={() => { setSpace({}); setSpaceOpen(false); }}>لغو</Button><Button onClick={saveSpace}>ذخیره</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>نام</TableHead><TableHead>نوع</TableHead><TableHead>مساحت</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(spaces || []).length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">فضایی ثبت نشده است.</TableCell></TableRow> :
                      (spaces || []).map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell><Badge variant="secondary">{spaceTypeLabel[s.type]}</Badge></TableCell>
                          <TableCell>{s.area ? `${s.area} متر` : '—'}</TableCell>
                          <TableCell className="space-x-2 space-x-reverse">
                            <Button size="sm" variant="outline" onClick={() => { setSpace(s); setSpaceOpen(true); }}>ویرایش</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteSpace(s.id)}>حذف</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tenants */}
          <TabsContent value="tenants">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>مستأجران</CardTitle>
                <Dialog open={tenantOpen} onOpenChange={setTenantOpen}>
                  <DialogTrigger asChild><Button><PlusCircle className="ml-2 h-4 w-4" />افزودن مستأجر</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>افزودن/ویرایش مستأجر</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div><Label>نام/برند</Label><Input value={tenant.name || ''} onChange={(e) => setTenant({ ...tenant, name: e.target.value })} /></div>
                      <div><Label>نام مسئول</Label><Input value={tenant.contact || ''} onChange={(e) => setTenant({ ...tenant, contact: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-2"><div><Label>تلفن</Label><Input value={tenant.phone || ''} onChange={(e) => setTenant({ ...tenant, phone: e.target.value })} /></div><div><Label>ایمیل</Label><Input value={tenant.email || ''} onChange={(e) => setTenant({ ...tenant, email: e.target.value })} /></div></div>
                      <div><Label>یادداشت</Label><Textarea value={tenant.note || ''} onChange={(e) => setTenant({ ...tenant, note: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button variant="secondary" onClick={() => { setTenant({}); setTenantOpen(false); }}>لغو</Button><Button onClick={saveTenant}>ذخیره</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>نام</TableHead><TableHead>مسئول</TableHead><TableHead>تلفن</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(tenants || []).length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">مستأجری ثبت نشده است.</TableCell></TableRow> :
                      (tenants || []).map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.name}</TableCell>
                          <TableCell>{t.contact || '—'}</TableCell>
                          <TableCell>{t.phone || '—'}</TableCell>
                          <TableCell className="space-x-2 space-x-reverse">
                            <Button size="sm" variant="outline" onClick={() => { setTenant(t); setTenantOpen(true); }}>ویرایش</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteTenant(t.id)}>حذف</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leases */}
          <TabsContent value="leases">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>قراردادهای اجاره</CardTitle>
                <Dialog open={leaseOpen} onOpenChange={setLeaseOpen}>
                  <DialogTrigger asChild><Button><PlusCircle className="ml-2 h-4 w-4" />افزودن قرارداد</Button></DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>افزودن/ویرایش قرارداد</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>مستأجر</Label>
                          <Select value={lease.tenantId || ''} onValueChange={(v) => setLease({ ...lease, tenantId: v })}>
                            <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                            <SelectContent>{(tenants || []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label>فضا</Label>
                          <Select value={lease.spaceId || ''} onValueChange={(v) => setLease({ ...lease, spaceId: v })}>
                            <SelectTrigger><SelectValue placeholder="انتخاب" /></SelectTrigger>
                            <SelectContent>{(spaces || []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>تاریخ شروع</Label><Input type="date" value={lease.startDate ? lease.startDate.split('T')[0] : ''} onChange={(e) => setLease({ ...lease, startDate: e.target.value })} /></div>
                        <div><Label>تاریخ پایان</Label><Input type="date" value={lease.endDate ? lease.endDate.split('T')[0] : ''} onChange={(e) => setLease({ ...lease, endDate: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div><Label>اجاره‌بها (ماهانه)</Label><Input type="number" value={lease.monthlyRent || ''} onChange={(e) => setLease({ ...lease, monthlyRent: Number(e.target.value) })} /></div>
                        <div><Label>ودیعه</Label><Input type="number" value={lease.deposit || ''} onChange={(e) => setLease({ ...lease, deposit: Number(e.target.value) })} /></div>
                        <div><Label>روز سررسید</Label><Input type="number" min={1} max={28} value={lease.billingDay || 1} onChange={(e) => setLease({ ...lease, billingDay: Number(e.target.value) })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>افزایش سالانه (٪)</Label><Input type="number" value={lease.escalationPct || ''} onChange={(e) => setLease({ ...lease, escalationPct: Number(e.target.value) })} /></div>
                        <div><Label>وضعیت</Label>
                          <Select value={lease.status || 'active'} onValueChange={(v) => setLease({ ...lease, status: v as LeaseStatus })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(leaseStatusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><Label>یادداشت</Label><Textarea value={lease.note || ''} onChange={(e) => setLease({ ...lease, note: e.target.value })} /></div>
                    </div>
                    <DialogFooter><Button variant="secondary" onClick={() => { setLease({}); setLeaseOpen(false); }}>لغو</Button><Button onClick={saveLease}>ذخیره</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>مستأجر</TableHead><TableHead>فضا</TableHead><TableHead>مبلغ (ماهانه)</TableHead><TableHead>سررسید</TableHead><TableHead>وضعیت</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(leases || []).length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">قراردادی ثبت نشده است.</TableCell></TableRow> :
                      (leases || []).map((l) => {
                        const st = effectiveLeaseStatus(l);
                        return (
                          <TableRow key={l.id}>
                            <TableCell>{tenantName(l.tenantId)}</TableCell>
                            <TableCell>{spaceName(l.spaceId)}</TableCell>
                            <TableCell>{l.monthlyRent.toLocaleString('fa-IR')} تومان</TableCell>
                            <TableCell>هر ماه روز {l.billingDay}</TableCell>
                            <TableCell><Badge variant={st === 'active' ? 'default' : 'secondary'}>{leaseStatusLabel[st]}</Badge></TableCell>
                            <TableCell className="space-x-2 space-x-reverse">
                              <Button size="sm" variant="outline" onClick={() => { setLease(l); setLeaseOpen(true); }}>ویرایش</Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteLease(l.id)}>حذف</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>صورتحساب‌های اجاره</CardTitle>
                <Button onClick={generateInvoices}><Receipt className="ml-2 h-4 w-4" />صدور صورتحساب ماه {periodLabel}</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>دوره</TableHead><TableHead>مستأجر</TableHead><TableHead>فضا</TableHead><TableHead>مبلغ</TableHead><TableHead>سررسید</TableHead><TableHead>وضعیت</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(rentInvoices || []).length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">صورتحسابی صادر نشده است.</TableCell></TableRow> :
                      (rentInvoices || []).slice().sort((a, b) => b.periodLabel.localeCompare(a.periodLabel)).map((r) => {
                        const st = effectiveRentStatus(r);
                        return (
                          <TableRow key={r.id}>
                            <TableCell>{r.periodLabel}</TableCell>
                            <TableCell>{tenantName(r.tenantId)}</TableCell>
                            <TableCell>{spaceName(r.spaceId)}</TableCell>
                            <TableCell>{r.amount.toLocaleString('fa-IR')} تومان</TableCell>
                            <TableCell>{jalali(r.dueDate)}</TableCell>
                            <TableCell><Badge variant={st === 'paid' ? 'default' : st === 'overdue' ? 'destructive' : 'secondary'}>{rentStatusLabel[st]}</Badge></TableCell>
                            <TableCell className="space-x-2 space-x-reverse">
                              {st !== 'paid' && <Button size="sm" variant="outline" onClick={() => payInvoice(r)}>وصول</Button>}
                              <Button size="sm" variant="destructive" onClick={() => deleteInvoice(r.id)}>حذف</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
