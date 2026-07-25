'use client';

import { useState } from 'react';
import { Users, Inbox, ClipboardList, CalendarDays, MessageSquare, Send, PlusCircle, Dumbbell, Salad } from 'lucide-react';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAppData, dataStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import { getSession } from '@/lib/management-auth';
import { trainerBusyHours } from '@/lib/trainer';
import type { ProgramType } from '@/lib/types';

const dayLabel = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

export default function TrainerPanelPage() {
  const { customers, bookings, classSessions, programs, chatMessages, users } = useAppData();
  const { toast } = useToast();
  const session = getSession();
  const me = (users || []).find((u) => u.id === session?.userId);
  const trainerId = me?.staffId || '';
  const trainerName = me?.name || session?.name || 'مربی';

  const [selected, setSelected] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  const [progOpen, setProgOpen] = useState(false);
  const [progType, setProgType] = useState<ProgramType>('workout');
  const [progTitle, setProgTitle] = useState('');
  const [progDetails, setProgDetails] = useState('');

  const members = (customers || []).filter((c) => c.status === 'active');
  const selMember = members.find((m) => m.id === selected);
  const conversations = members.filter((m) => (chatMessages || []).some((cm) => cm.trainerId === trainerId && cm.memberId === m.id));
  const unread = (chatMessages || []).filter((cm) => cm.trainerId === trainerId && cm.from === 'member').length;
  const myPrograms = (programs || []).filter((p) => p.trainerId === trainerId);
  const myBookings = (bookings || []).filter((b) => b.trainerId === trainerId && b.status !== 'cancelled');
  const myClasses = (classSessions || []).filter((c) => c.trainerId === trainerId);
  const busy = trainerBusyHours(trainerId, myClasses, myBookings);
  const thread = (chatMessages || [])
    .filter((cm) => cm.trainerId === trainerId && cm.memberId === selected)
    .sort((a, b) => a.at.localeCompare(b.at));

  const sendChat = () => {
    if (!selMember || !chatText.trim()) return;
    dataStore.saveData({
      chatMessages: [
        ...(chatMessages || []),
        { id: uid('msg'), trainerId, trainerName, memberId: selMember.id, memberName: selMember.name, from: 'trainer', text: chatText.trim(), at: new Date().toISOString() },
      ],
    });
    setChatText('');
  };

  const sendProg = () => {
    if (!selMember) return;
    dataStore.saveData({
      programs: [
        ...(programs || []),
        {
          id: uid('prog'), type: progType, memberId: selMember.id, memberName: selMember.name,
          trainerId, trainerName, title: progTitle || (progType === 'workout' ? 'برنامه تمرینی' : 'برنامه غذایی'),
          details: progDetails, createdAt: new Date().toISOString(),
        },
      ],
    });
    setProgOpen(false); setProgTitle(''); setProgDetails('');
    toast({ title: 'موفق', description: `برنامه برای ${selMember.name} ارسال شد.` });
  };

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="پنل مربی" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title={`پنل مربی — ${trainerName}`}>
          <p className="text-sm text-muted-foreground">مدیریت شاگردان، چت، ارسال برنامه تمرینی/غذایی، صندوق درخواست‌ها و زمان‌بندی.</p>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-4 mb-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">شاگردان</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{members.length.toLocaleString('fa-IR')}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">گفت‌وگوها</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-primary">{conversations.length.toLocaleString('fa-IR')}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">صندوق (پیام جدید)</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-amber-600">{unread.toLocaleString('fa-IR')}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">برنامه‌های ارسالی</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{myPrograms.length.toLocaleString('fa-IR')}</CardContent></Card>
        </div>

        <Tabs defaultValue="students">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="students"><Users className="ml-1 h-4 w-4" />شاگردان</TabsTrigger>
            <TabsTrigger value="inbox"><Inbox className="ml-1 h-4 w-4" />صندوق {unread > 0 && <Badge className="mr-1">{unread}</Badge>}</TabsTrigger>
            <TabsTrigger value="programs"><ClipboardList className="ml-1 h-4 w-4" />برنامه‌ها</TabsTrigger>
            <TabsTrigger value="schedule"><CalendarDays className="ml-1 h-4 w-4" />زمان‌بندی</TabsTrigger>
          </TabsList>

          {/* Students */}
          <TabsContent value="students">
            <Card>
              <CardHeader><CardTitle>لیست شاگردان</CardTitle><CardDescription>شاگرد را انتخاب کنید تا چت کنید یا برنامه بفرستید.</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>نام</TableHead><TableHead>تلفن</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {members.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">شاگردی ثبت نشده است.</TableCell></TableRow> :
                      members.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>{m.name}</TableCell>
                          <TableCell dir="ltr">{m.phone || '—'}</TableCell>
                          <TableCell className="space-x-1 space-x-reverse">
                            <Button size="sm" variant={selected === m.id ? 'default' : 'outline'} onClick={() => setSelected(m.id)}>انتخاب</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>

                {selMember && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" />چت با {selMember.name}</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <div className="max-h-56 overflow-y-auto space-y-1 text-sm">
                          {thread.length === 0 ? <p className="text-muted-foreground">گفت‌وگویی شروع نشده است.</p> :
                            thread.map((m) => (
                              <div key={m.id} className={m.from === 'trainer' ? 'text-left' : 'text-right'}>
                                <span className={`inline-block rounded px-2 py-1 ${m.from === 'trainer' ? 'bg-primary/10' : 'bg-muted'}`}>{m.text}</span>
                              </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                          <Input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="پیام…" onKeyDown={(e) => e.key === 'Enter' && sendChat()} />
                          <Button size="icon" onClick={sendChat}><Send className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-base">ارسال برنامه</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <Button className="w-full" onClick={() => { setProgType('workout'); setProgOpen(true); }}><Dumbbell className="ml-1 h-4 w-4" />برنامه تمرینی</Button>
                        <Button className="w-full" variant="outline" onClick={() => { setProgType('nutrition'); setProgOpen(true); }}><Salad className="ml-1 h-4 w-4" />برنامه غذایی</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inbox */}
          <TabsContent value="inbox">
            <Card>
              <CardHeader><CardTitle>صندوق گفت‌وگوها</CardTitle><CardDescription>شاگردانی که با شما پیام داشته‌اند.</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>شاگرد</TableHead><TableHead>آخرین پیام</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {conversations.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">گفت‌وگویی ثبت نشده است.</TableCell></TableRow> :
                      conversations.map((m) => {
                        const last = (chatMessages || []).filter((cm) => cm.trainerId === trainerId && cm.memberId === m.id).sort((a, b) => b.at.localeCompare(a.at))[0];
                        return (
                          <TableRow key={m.id}>
                            <TableCell>{m.name}</TableCell>
                            <TableCell className="truncate max-w-[200px]">{last?.text || '—'}</TableCell>
                            <TableCell><Button size="sm" variant="outline" onClick={() => setSelected(m.id)}>باز کردن چت</Button></TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Programs */}
          <TabsContent value="programs">
            <Card>
              <CardHeader><CardTitle>برنامه‌های ارسالی</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>شاگرد</TableHead><TableHead>نوع</TableHead><TableHead>عنوان</TableHead><TableHead>جزئیات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {myPrograms.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">برنامه‌ای ارسال نشده است.</TableCell></TableRow> :
                      myPrograms.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.memberName}</TableCell>
                          <TableCell><Badge variant="secondary">{p.type === 'workout' ? 'تمرینی' : 'غذایی'}</Badge></TableCell>
                          <TableCell>{p.title}</TableCell>
                          <TableCell className="max-w-[260px] truncate">{p.details || '—'}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />زمان‌بندی و زمان‌های آزاد/بسته</CardTitle>
                <CardDescription>سلول‌های سبز زمان آزاد و کهربایی زمان اشغال شماست.</CardDescription></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-center text-xs border-separate" style={{ borderSpacing: '2px' }}>
                  <thead><tr><th className="p-1 text-muted-foreground font-normal">ساعت</th>{dayLabel.map((d) => <th key={d} className="p-1 text-muted-foreground font-normal whitespace-nowrap">{d}</th>)}</tr></thead>
                  <tbody>
                    {HOURS.map((h) => (
                      <tr key={h}>
                        <td className="p-1 text-muted-foreground whitespace-nowrap">{`${h}:00`}</td>
                        {dayLabel.map((_, di) => {
                          const isBusy = (busy[di] || []).includes(h);
                          return <td key={di} className={`p-1 rounded ${isBusy ? 'bg-amber-300' : 'bg-green-100'}`}>{isBusy ? '●' : ''}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-2">رزروهای آینده: {myBookings.length} · کلاس‌های هفتگی: {myClasses.length}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={progOpen} onOpenChange={setProgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ارسال برنامه {progType === 'workout' ? 'تمرینی' : 'غذایی'} برای {selMember?.name}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div><Label>عنوان</Label><Input value={progTitle} onChange={(e) => setProgTitle(e.target.value)} placeholder={progType === 'workout' ? 'برنامه تمرینی هفته اول' : 'رژیم کاهش وزن'} /></div>
            <div><Label>جزئیات (خط به خط)</Label><Textarea value={progDetails} onChange={(e) => setProgDetails(e.target.value)} placeholder="روز ۱: …" /></div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setProgOpen(false)}>لغو</Button><Button onClick={sendProg}>ارسال</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
