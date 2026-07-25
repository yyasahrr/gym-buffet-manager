import { NextResponse } from 'next/server';
import { getDevOtp } from '@/server/otp';

// DEV/TESTING ONLY: reveals the pending OTP for a national ID when SMS is in
// "log" mode (the default). Real SMS providers will not expose the code.
// Never rely on this in production.
export async function GET(req: Request) {
  const nationalId = new URL(req.url).searchParams.get('nationalId') || '';
  const code = getDevOtp(nationalId);
  if (!code) {
    return NextResponse.json({ error: 'otp not available (use real SMS or enable PORTAL_DEV_SHOW_OTP)' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, nationalId, code });
}
