'use client';

import { useState } from 'react';
import { PlusCircle, LifeBuoy, Mail, MessageSquare, Phone, Globe, Footprints, Send } from 'lucide-react';
import { format as formatJalali } from 'date-fns-jalali';

import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData, dataStore } from '@/lib/store';
import { uid } from '@/lib/utils';
import type { Ticket, TicketChannel, TicketPriority, TicketStatus, TicketMessage } from '@/lib/types';

const channelLabel: Record<TicketChannel, string> = { email: 'ایمیل', sms: 'پیامک', phone: 'تلفن', portal: 'پورتال', walkin: 'حضوری' };
const channelIcon: Record<TicketChannel, React.ElementType> = { email: Mail, sms: MessageSquare, phone: Phone, portal: Globe, walkin: Footprints };
const priorityLabel: Record<TicketPriority, string> = { low: 'کم', normal: 'معمولی', high: 'بالا', urgent: 'فوری' };
const statusLabel: Record<TicketStatus, string> = { open: 'باز', pending: 'در انتظار', resolved: 'حل‌شده', closed: 'بسته‌شده' };
const scopeLabel: Record<string, string> = { buffet: 'بوفه', gym: 'باشگاه', system: 'سیستم' };

function jalali(iso: string, fmt = 'yyyy/MM/dd HH:mm') {
  try { return formatJalali(new Date(iso), fmt); } catch { return iso; }
}

export default function HelpDeskPage() {
  const { tickets } = useAppData();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Ticket>>({ channel: 'walkin', priority: 'normal', scope: 'gym' });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const list = (tickets || []).filter((t) => statusFilter === 'all' || t.status === statusFilter);
  const selected = (tickets || []).find((t) => t.id === selectedId) || null;

  const addTicket = () => {
    if (!form.subject) { toast({ variant: 'destructive', title: 'خطا', description: 'موضوع تیکت را وارد کنید.' }); return; }
    const now = new Date().toISOString();
    const msg: TicketMessage | undefined = form.subject ? { id: uid('msg'), at: now, from: 'customer', text: (form as any)._firstMessage || form.subject } : undefined;
    const ticket: Ticket = {
      id: uid('tk'),
      subject: form.subject,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      channel: (form.channel || 'walkin') as TicketChannel,
      priority: (form.priority || 'normal') as TicketPriority,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      assignedTo: form.assignedTo,
      scope: form.scope,
      messages: msg ? [msg] : [],
      tags: [],
    };
    dataStore.saveData({ tickets: [ticket, ...(tickets || [])] });
    setForm({ channel: 'walkin', priority: 'normal', scope: 'gym' });
    setOpen(false);
    setSelectedId(ticket.id);
    toast({ title: 'موفق', description: 'تیکت ثبت شد.' });
  };

  const sendReply = () => {
    if (!selected || !reply.trim()) return;
    const msg: TicketMessage = { id: uid('msg'), at: new Date().toISOString(), from: 'agent', text: reply.trim() };
    dataStore.saveData({
      tickets: (tickets || []).map((t) => t.id === selected.id ? { ...t, messages: [...t.messages, msg], updatedAt: new Date().toISOString() } : t),
    });
    setReply('');
    toast({ title: 'موفق', description: 'پاسخ ثبت شد.' });
  };

  const changeStatus = (status: TicketStatus) => {
    if (!selected) return;
    dataStore.saveData({ tickets: (tickets || []).map((t) => t.id === selected.id ? { ...t, status, updatedAt: new Date().toISOString() } : t) });
  };

  const openCount = (tickets || []).filter((t) => t.status === 'open' || t.status === 'pending').length;

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumbs={[]} activeBreadcrumb="پشتیبانی / تیکت‌ها" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="پشتیبانی و تیکت‌ها (Help Desk)">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{openCount} تیکت باز</Badge>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><PlusCircle className="ml-2 h-4 w-4" />تیکت جدید</Button></DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>ثبت تیکت جدید</DialogTitle></DialogHeader>
                <div className="grid gap-3 py-2">
                  <div><Label>موضوع</Label><Input value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>نام مشتری</Label><Input value={form.contactName || ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
                    <div><Label>تلفن</Label><Input value={form.contactPhone || ''} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>کانال</Label>
                      <Select value={form.channel || 'walkin'} onValueChange={(v) => setForm({ ...form, channel: v as TicketChannel })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(channelLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>اولویت</Label>
                      <Select value={form.priority || 'normal'} onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(priorityLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>مربوط به</Label>
                      <Select value={form.scope || 'gym'} onValueChange={(v) => setForm({ ...form, scope: v as 'buffet' | 'gym' | 'system' })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(scopeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Modal_firstMessage form={form} setForm={setForm} /></div>
                  </div>
                </div>
                <DialogFooter><Button variant="secondary" onClick={() => { setForm({ channel: 'walkin', priority: 'normal', scope: 'gym' }); setOpen(false); }}>لغو</Button><Button onClick={addTicket}>ثبت</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-3">
          {/* List */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LifeBuoy className="h-4 w-4" />تیکت‌ها</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="open">باز</SelectItem>
                  <SelectItem value="pending">در انتظار</SelectItem>
                  <SelectItem value="resolved">حل‌شده</SelectItem>
                  <SelectItem value="closed">بسته‌شده</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="max-h-[60vh] overflow-y-auto space-y-2">
              {list.length === 0 ? <p className="text-center text-muted-foreground text-sm py-6">تیکتی وجود ندارد.</p> :
                list.map((t) => {
                  const Icon = channelIcon[t.channel];
                  return (
                    <button key={t.id} onClick={() => setSelectedId(t.id)} className={`w-full text-right rounded-lg border p-3 hover:bg-muted/50 ${selectedId === t.id ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{t.subject}</span>
                        <Badge variant={t.status === 'open' ? 'destructive' : t.status === 'resolved' ? 'default' : 'secondary'}>{statusLabel[t.status]}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Icon className="h-3 w-3" />{channelLabel[t.channel]} · {t.contactName || 'ناشناس'}</span>
                        <span>{priorityLabel[t.priority]}</span>
                      </div>
                    </button>
                  );
                })}
            </CardContent>
          </Card>

          {/* Detail */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{selected ? selected.subject : 'جزئیات تیکت'}</CardTitle>
              {selected && <CardDescription>{selected.contactName || 'ناشناس'} · {channelLabel[selected.channel]} · {scopeLabel[selected.scope || 'gym']} · ایجاد {jalali(selected.createdAt)}</CardDescription>}
            </CardHeader>
            <CardContent>
              {!selected ? <p className="text-center text-muted-foreground py-10">یک تیکت را انتخاب کنید.</p> : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Select value={selected.status} onValueChange={(v) => changeStatus(v as TicketStatus)}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(statusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                    <Badge variant="outline">اولویت: {priorityLabel[selected.priority]}</Badge>
                  </div>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto border rounded-lg p-3 bg-muted/20">
                    {selected.messages.length === 0 ? <p className="text-sm text-muted-foreground">پیامی ثبت نشده است.</p> :
                      selected.messages.map((m) => (
                        <div key={m.id} className={`rounded-lg p-2 text-sm ${m.from === 'agent' ? 'bg-primary/10 mr-auto w-fit' : 'bg-background border'}`}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span className="font-medium">{m.from === 'agent' ? 'پشتیبانی' : selected.contactName || 'مشتری'}</span>
                            <span>{jalali(m.at, 'MM/dd HH:mm')}</span>
                          </div>
                          {m.text}
                        </div>
                      ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="پاسخ شما به مشتری..." className="min-h-[60px]" />
                    <Button onClick={sendReply} className="shrink-0"><Send className="ml-2 h-4 w-4" />ارسال</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// کامپوننت کوچک برای اولین پیام تیکت
function Modal_firstMessage({ form, setForm }: { form: Partial<Ticket>; setForm: (f: Partial<Ticket>) => void }) {
  return (
    <div>
      <Label>اولین پیام</Label>
      <Input
        value={(form as any)._firstMessage || ''}
        onChange={(e) => setForm({ ...form, _firstMessage: e.target.value } as any)}
        placeholder="متن درخواست مشتری"
      />
    </div>
  );
}
