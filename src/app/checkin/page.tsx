'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, ScanLine } from 'lucide-react';
import { QrCode } from '@/components/portal/qr-code';

// Public self check-in kiosk. A member scans the QR on their dashboard/portal
// card (which links here with ?token=...). On load we record the attendance.
export default function CheckInPage() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || '';
    setToken(t);
    if (!t) {
      setStatus('error');
      setMessage('توکن عضویت یافت نشد.');
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/portal/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: t }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setStatus('ok');
          setMessage(`خوش‌آمدید ${data.member}! چک‌این ثبت شد.`);
        } else {
          setStatus('error');
          setMessage(data.error || 'ثبت چک‌این ناموفق بود.');
        }
      } catch {
        setStatus('error');
        setMessage('ارتباط با سرور برقرار نشد.');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <ScanLine className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">چک‌این باشگاه</h1>
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>در حال ثبت حضور…</p>
          </div>
        )}
        {status === 'ok' && (
          <div className="space-y-3">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
            <p className="text-lg font-semibold">{message}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-3">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <p className="text-destructive">{message}</p>
          </div>
        )}
        {token && (
          <div className="pt-4">
            <p className="text-xs text-muted-foreground mb-2">کارت عضویت شما:</p>
            <div className="inline-block"><QrCode value={`${window.location.origin}/checkin?token=${token}`} size={140} /></div>
          </div>
        )}
      </div>
    </div>
  );
}
