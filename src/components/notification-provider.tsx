'use client';

import { useEffect, useRef } from 'react';
import { useAppData } from '@/lib/store';
import { daysUntil } from '@/lib/membership';

// Shows local push-style notifications (via the registered Service Worker)
// for upcoming birthdays and membership expiries, when enabled in settings.
export function NotificationProvider() {
  const { customers, memberships, account } = useAppData();
  const askedRef = useRef(false);

  // Request permission once when the user enables notifications.
  useEffect(() => {
    if (account?.enableNotifications && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default' && !askedRef.current) {
        askedRef.current = true;
        Notification.requestPermission().catch(() => {});
      }
    }
  }, [account?.enableNotifications]);

  // Fire reminders shortly after load (and whenever data changes) if enabled.
  useEffect(() => {
    if (!account?.enableNotifications) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const fire = (title: string, body: string) => {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, { body, icon: '/icon-192.png' }));
        } else {
          new Notification(title, { body, icon: '/icon-192.png' });
        }
      } catch { /* ignore */ }
    };

    const now = new Date();
    (customers || []).forEach((c) => {
      if (!c.birthDate) return;
      const b = new Date(c.birthDate);
      const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
      if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next.setFullYear(now.getFullYear() + 1);
      const d = Math.round((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (d === 0) fire('🎂 تولد مشتری', `امروز تولد ${c.name} است.`);
      else if (d === 1) fire('🎂 یادآوری تولد', `فردا تولد ${c.name} است.`);
    });

    (memberships || []).forEach((m) => {
      if (m.status !== 'active') return;
      const d = daysUntil(m.endDate);
      if (d === 0) fire('⏰ پایان عضویت', `عضویت یک مشتری امروز به پایان می‌رسد.`);
      else if (d >= 1 && d <= 3) fire('⏰ یادآوری انقضا', `عضویت یک مشتری تا ${d} روز دیگر به پایان می‌رسد.`);
    });
  }, [customers, memberships, account?.enableNotifications]);

  return null;
}
