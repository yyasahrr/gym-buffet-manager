'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Dumbbell, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppData } from '@/lib/store';
import { initials, avatarColor } from '@/lib/trainer';

export default function TrainersPage() {
  const { staff } = useAppData();
  const [branch, setBranch] = useState<string>('all');

  const trainers = useMemo(
    () => (staff || []).filter((s) => s.role === 'trainer' && s.status === 'active'),
    [staff]
  );
  const branches = useMemo(
    () => Array.from(new Set((staff || []).map((s) => s.branch).filter(Boolean) as string[])),
    [staff]
  );
  const filtered = branch === 'all' ? trainers : trainers.filter((t) => t.branch === branch);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Dumbbell className="h-6 w-6 text-primary" /> مربیان باشگاه</h1>
            <p className="text-muted-foreground">نمای عمومی مربیان — رزومه، تخصص، شهریه خصوصی و زمان‌های آزاد.</p>
          </div>
          {branches.length > 0 && (
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="شعبه" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه مجموعه‌ها</SelectItem>
                {branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">هنوز مربی‌ای برای نمایش عمومی ثبت نشده است.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <Link key={t.id} href={`/trainers/${t.id}`} className="block">
                <Card className="hover:border-primary transition-colors h-full">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${avatarColor(t.name)}`}>
                        {initials(t.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.branch || 'باشگاه'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(t.specialties || []).map((sp) => <Badge key={sp} variant="secondary">{sp}</Badge>)}
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1 border-t">
                      <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> شهریه خصوصی</span>
                      <span className="font-semibold">{t.privateRate ? `${t.privateRate.toLocaleString('fa-IR')} تومان` : 'توافقی'}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
