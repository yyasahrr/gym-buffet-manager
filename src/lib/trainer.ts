import type { Booking, ClassSession, TrainerHoliday } from './types';

export interface ActivityDay {
  date: Date;
  iso: string;
  count: number;
}

// ساخت سری فعالیت به سبک گیت‌هاب: روزهای `weeks` هفتهٔ اخیر تا امروز.
// هر روز شمارش جلسات مربی (رزروها + کلاس‌های هفتگی تکرارشونده) را نشان می‌دهد.
export function trainerActivity(
  trainerId: string,
  bookings: Booking[],
  classSessions: ClassSession[],
  weeks = 53
): ActivityDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const totalDays = weeks * 7;
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));
  // هم‌تراز کردن شروع با شنبه (dayOfWeek ما ۰=شنبه)
  const diff = (6 - start.getDay() + 7) % 7;
  start.setDate(start.getDate() - diff);

  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const counts = new Map<string, number>();

  (bookings || []).forEach((b) => {
    if (b.trainerId !== trainerId || b.status === 'cancelled') return;
    const d = new Date(b.date);
    if (isNaN(d.getTime())) return;
    const k = key(d);
    counts.set(k, (counts.get(k) || 0) + 1);
  });

  (classSessions || []).forEach((c) => {
    if (c.trainerId !== trainerId) return;
    const target = (c.dayOfWeek + 6) % 7; // تبدیل dayOfWeek(۰=شنبه) به getDay(۰=یکشنبه)
    for (let cur = new Date(start); cur <= today; cur.setDate(cur.getDate() + 1)) {
      if (cur.getDay() === target) {
        const k = key(cur);
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
  });

  const days: ActivityDay[] = [];
  for (let cur = new Date(start); cur <= today; cur.setDate(cur.getDate() + 1)) {
    days.push({ date: new Date(cur), iso: cur.toISOString(), count: counts.get(key(cur)) || 0 });
  }
  return days;
}

// شنبه‌بندی ساعت‌های شلوغ هر روز هفته برای بورد «آزاد/بسته».
// خروجی: dayOfWeek(۰=شنبه) -> لیست ساعت‌های شلوغ (از کلاس‌های هفتگی + رزروها).
export function trainerBusyHours(
  trainerId: string,
  classSessions: ClassSession[],
  bookings: Booking[]
): Record<number, number[]> {
  const map: Record<number, Set<number>> = {};
  const add = (day: number, hour: number) => {
    if (!map[day]) map[day] = new Set();
    map[day].add(hour);
  };
  (classSessions || []).forEach((c) => {
    if (c.trainerId !== trainerId) return;
    const hour = parseInt((c.startTime || '08:00').split(':')[0], 10) || 8;
    add(c.dayOfWeek, hour);
  });
  (bookings || []).forEach((b) => {
    if (b.trainerId !== trainerId || b.status === 'cancelled') return;
    const d = new Date(b.date);
    if (isNaN(d.getTime())) return;
    const day = (d.getDay() + 6) % 7; // به dayOfWeek ما
    const hour = parseInt((b.startTime || '08:00').split(':')[0], 10) || 8;
    add(day, hour);
  });
  const result: Record<number, number[]> = {};
  Object.keys(map).forEach((k) => { result[Number(k)] = Array.from(map[Number(k)]).sort((a, b) => a - b); });
  return result;
}

// رنگ‌بندی مربع فعالیت بر اساس تعداد (مثل گیت‌هاب)
export function activityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

export const levelClass: Record<number, string> = {
  0: 'bg-muted',
  1: 'bg-green-200',
  2: 'bg-green-400',
  3: 'bg-green-600',
  4: 'bg-green-800',
};

export function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
}

// رنگ پس‌زمینه پایدار از روی نام (برای آواتار مربی)
export function avatarColor(name: string): string {
  const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-sky-500', 'bg-indigo-500', 'bg-fuchsia-500'];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

/** محاسبه سهم‌ها با فرمول قابل تنظیم و کنترل مبلغ‌های نامعتبر. */
export function splitTrainerPayment(amount: number, gymPercent: number, taxPercent = 0) {
  const gross = Math.max(0, Math.round(Number(amount) || 0));
  const tax = Math.round(gross * Math.max(0, taxPercent) / 100);
  const afterTax = gross - tax;
  const gym = Math.round(afterTax * Math.min(100, Math.max(0, gymPercent)) / 100);
  return { gross, tax, gym, trainer: afterTax - gym, net: afterTax };
}

/** تولید رزروهای هفتگی ماه؛ تعطیلات و آخرهفته‌های انتخابی را رد می‌کند. */
export function expandMonthlyBookings(startDate: string, year: number, month: number, dayOfWeek: number, time: string, holidays: string[] = []) {
  const out: string[] = [];
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    const appDay = (cursor.getDay() + 6) % 7;
    const iso = cursor.toISOString().slice(0, 10);
    if (appDay === dayOfWeek && !holidays.includes(iso)) out.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out.map(date => ({ date, time, sourceDate: startDate }));
}

/** بررسی تداخل زمانی یک رزرو با رزروها و کلاس‌های موجود. */
export function hasTrainerConflict(trainerId: string, date: string, startTime: string, endTime: string, bookings: Array<{ trainerId: string; date: string; startTime: string; endTime?: string; status?: string }>, holidays: TrainerHolidayLike[] = []) {
  if (holidays.some(h => h.date === date && (h.scope === 'gym' || h.trainerId === trainerId))) return true;
  const minutes = (x: string) => { const [h, m] = x.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const start = minutes(startTime), end = minutes(endTime);
  return bookings.some(b => b.trainerId === trainerId && b.date === date && b.status !== 'cancelled' && start < minutes(b.endTime || `${Math.min(23, Math.floor(start / 60) + 1).toString().padStart(2, '0')}:00`) && end > minutes(b.startTime));
}
export type TrainerHolidayLike = { date: string; scope: 'gym' | 'trainer'; trainerId?: string };
