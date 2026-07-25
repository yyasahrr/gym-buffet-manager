import { NextResponse } from 'next/server';
import { getDB } from '@/server/db';

// Ultra-light endpoint used by the management UI to poll for changes on the
// customer portal server. Returns only the last-modified timestamp so the
// management page can decide whether to re-pull portal activity.
export async function GET() {
  try {
    const db = getDB();
    const stamps = [
      ...db.payments.map((p) => new Date(p.createdAt).getTime()),
      ...db.members.map((m) => new Date(m.createdAt).getTime()),
      ...db.invoices.map((i) => new Date(i.issueDate || i.createdAt || Date.now()).getTime()),
      ...db.memberships.map((m) => new Date(m.startDate).getTime()),
    ];
    const lastModified = stamps.length ? Math.max(...stamps) : Date.now();
    return NextResponse.json({ ok: true, lastModified });
  } catch {
    return NextResponse.json({ ok: false, lastModified: Date.now() }, { status: 500 });
  }
}
