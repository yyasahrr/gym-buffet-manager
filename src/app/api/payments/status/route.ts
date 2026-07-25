import { NextRequest, NextResponse } from 'next/server';
import { findPaymentByAuthority } from '@/server/db';
export async function GET(req: NextRequest) {
  const authority = new URL(req.url).searchParams.get('authority');
  if (!authority) return NextResponse.json({ error: 'authority required' }, { status: 400 });
  const payment = findPaymentByAuthority(authority);
  if (!payment) return NextResponse.json({ error: 'payment not found' }, { status: 404 });
  return NextResponse.json({ ok: true, id: payment.id, kind: payment.kind, bookingId: payment.bookingId, status: payment.status, refId: payment.refId, amount: payment.amount });
}
