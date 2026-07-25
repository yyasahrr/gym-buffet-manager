'use client';

import { useState } from 'react';
import { PlusCircle, Users, UserCheck, Trash2, Check, X } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAppData, dataStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import { sha256 } from '@/lib/management-auth';
import { ROLE_LABELS, roleLabel } from '@/lib/rbac';
import type { UserAccount, ManagementRole, TrainerApplication, Staff } from '@/lib/types';

const ROLES = Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[];

export default function UsersPage() {
  const { users, trainerApplications, staff } = useAppData();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<ManagementRole>('reception');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(true);

  const reset = () => { setEditing(null); setUsername(''); setName(''); setRole('reception'); setPassword(''); setActive(true); };

  const save = async () => {
    if (!username.trim() || !name.trim()) {
      toast({ variant: 'destructive', title: 'خطا', description: 'نام‌کاربری و نام را وارد کنید.' });
      return;
    }
    if (!editing && !password) {
      toast({ variant: 'destructive', title: 'خطا', description: 'گذرواژه را وارد کنید.' });
      return;
    }
    const hash = password ? await sha256(password) : editing?.passwordHash;
    const list = users || [];
    if (editing) {
      dataStore.saveData({ users: list.map((u) => u.id === editing.id ? { ...u, username: username.trim(), name: name.trim(), role, active, passwordHash: hash } : u) });
    } else {
      const user: UserAccount = {
        id: uid('user'), username: username.trim(), name: name.trim(), role,
        passwordHash: hash, active, createdAt: new Date().toISOString(),
      };
      dataStore.saveData({ users: [...list, user], account: { ...(useAppData().account), requireManagementAuth: true } });
    }
    setOpen(false); reset();
    toast({ title: 'موفق', description: 'کاربر ذخیره شد.' });
  };

  const del = (id: string) => dataStore.saveData({ users: (users || []).filter((u) => u.id !== id) });

  const approveApp = async (app: TrainerApplication) => {
    const staffMember: Staff = {
      id: uid('staff'), name: app.name, role: 'trainer', employmentType: 'contract',
      phone: app.phone, monthlySalary: 0, hireDate: new Date().toISOString(), status: 'active',
      bio: app.resume, specialties: [],
    };
    const uname = 'trainer_' + ((users?.length || 0) + 1);
    const hash = await sha256('1234'); // گذرواژه پیش‌فرض — مربی بعداً تغییر دهد
    const user: UserAccount = {
      id: uid('user'), username: uname, name: app.name, role: 'trainer',
      passwordHash: hash, active: true, staffId: staffMember.id, createdAt: new Date().toISOString(),
      mustChangePassword: true,
    };
    dataStore.saveData((cur) => ({
      ...cur,
      staff: [...(cur.staff || []), staffMember],
      users: [...(cur.users || []), user],
      trainerApplications: (cur.trainerApplications || []).map((a) => a.id === app.id ? { ...a, status: 'approved', reviewedAt: new Date().toISOString() } : a),
      account: { ...cur.account, requireManagementAuth: true },
    }));
    toast({ title: 'موفق', description: `مربی ${app.name} به سیستم (و حسابداری) افزوده شد. نام‌کاربری: ${uname} / گذرواژه: 1234` });
  };

  const rejectApp = (app: TrainerApplication) => {
    dataStore.saveData({ trainerApplications: (trainerApplications || []).map((a) => a.id === app.id ? { ...a, status: 'rejected', reviewedAt: new Date().toISOString() } : a) });
    toast({ title: 'رد شد', description: 'درخواست رد شد.' });
  };

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="کاربران و دسترسی‌ها" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="مدیریت کاربران و دسترسی‌ها">
          <p className="text-sm text-muted-foreground">ادمین کاربران را می‌سازد و سطح دسترسی (نقش RBAC) هر کدام را تعیین می‌کند. تایید درخواست مربی، او را به کارکنان و حسابداری می‌افزاید.</p>
        </PageHeader>

        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users"><Users className="ml-1 h-4 w-4" />کاربران</TabsTrigger>
            <TabsTrigger value="apps"><UserCheck className="ml-1 h-4 w-4" />درخواست‌های مربیگری</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>لیست کاربران</CardTitle>
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
                  <DialogTrigger asChild><Button onClick={() => reset()}><PlusCircle className="ml-2 h-4 w-4" />افزودن کاربر</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editing ? 'ویرایش کاربر' : 'افزودن کاربر'}</DialogTitle></DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>نام‌کاربری</Label><Input dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" /></div>
                        <div><Label>نام</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>نقش</Label>
                          <Select value={role} onValueChange={(v) => setRole(v as ManagementRole)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label>گذرواژه {editing && '(خالی = بدون تغییر)'}</Label><Input type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••" /></div>
                      </div>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> کاربر فعال باشد</label>
                    </div>
                    <DialogFooter><Button variant="secondary" onClick={() => { setOpen(false); reset(); }}>لغو</Button><Button onClick={save}>ذخیره</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>نام‌کاربری</TableHead><TableHead>نام</TableHead><TableHead>نقش</TableHead><TableHead>وضعیت</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(users || []).length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">کاربری ثبت نشده است.</TableCell></TableRow> :
                      (users || []).map((u) => (
                        <TableRow key={u.id}>
                          <TableCell dir="ltr">{u.username}</TableCell>
                          <TableCell>{u.name}</TableCell>
                          <TableCell><Badge variant="secondary">{roleLabel(u.role)}</Badge></TableCell>
                          <TableCell>{u.active ? <Badge>فعال</Badge> : <Badge variant="destructive">غیرفعال</Badge>}</TableCell>
                          <TableCell className="space-x-2 space-x-reverse">
                            <Button size="sm" variant="outline" onClick={() => { setEditing(u); setUsername(u.username); setName(u.name); setRole(u.role); setActive(u.active); setOpen(true); }}>ویرایش</Button>
                            <Button size="sm" variant="destructive" onClick={() => del(u.id)}>حذف</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications */}
          <TabsContent value="apps">
            <Card>
              <CardHeader><CardTitle>درخواست‌های همکاری مربی</CardTitle>
                <CardDescription>افرادی که فرم درخواست همکاری را پر کرده‌اند؛ در صورت تایید به سیستم و حسابداری افزوده می‌شوند.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>نام</TableHead><TableHead>تلفن</TableHead><TableHead>وضعیت</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(trainerApplications || []).length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">درخواستی ثبت نشده است.</TableCell></TableRow> :
                      (trainerApplications || []).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.name}</TableCell>
                          <TableCell dir="ltr">{a.phone || '—'}</TableCell>
                          <TableCell>
                            {a.status === 'pending' ? <Badge variant="secondary">در انتظار</Badge> :
                             a.status === 'approved' ? <Badge>تایید شده</Badge> : <Badge variant="destructive">رد شده</Badge>}
                          </TableCell>
                          <TableCell className="space-x-1 space-x-reverse">
                            <Dialog>
                              <DialogTrigger asChild><Button size="sm" variant="outline">جزئیات</Button></DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>{a.name}</DialogTitle></DialogHeader>
                                <div className="text-sm space-y-2 max-h-72 overflow-y-auto">
                                  <p><b>تلفن:</b> {a.phone || '—'}</p>
                                  <p><b>ایمیل:</b> {a.email || '—'}</p>
                                  <p><b>رزومه:</b> {a.resume || '—'}</p>
                                  <p><b>نمونه کار:</b> {a.portfolio || '—'}</p>
                                  <p><b>سابقه:</b> {a.experience || '—'}</p>
                                </div>
                                {a.status === 'pending' && (
                                  <DialogFooter>
                                    <Button variant="destructive" onClick={() => rejectApp(a)}><X className="ml-1 h-4 w-4" />رد</Button>
                                    <Button onClick={() => approveApp(a)}><Check className="ml-1 h-4 w-4" />تایید و افزودن به سیستم</Button>
                                  </DialogFooter>
                                )}
                              </DialogContent>
                            </Dialog>
                            {a.status === 'pending' && (
                              <>
                                <Button size="sm" variant="destructive" onClick={() => rejectApp(a)}><X className="h-4 w-4" /></Button>
                                <Button size="sm" onClick={() => approveApp(a)}><Check className="h-4 w-4" /></Button>
                              </>
                            )}
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
