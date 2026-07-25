import { NextResponse } from 'next/server';
import { getNotifications } from '@/server/notify';

// Returns the most recent logged/sent notifications (useful for verification and
// for an admin view of what was delivered). This is a self-hosted admin endpoint.
export async function GET() {
  try {
    const notifications = getNotifications(50);
    return NextResponse.json({ ok: true, notifications });
  } catch (e) {
    console.error('notify history error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
