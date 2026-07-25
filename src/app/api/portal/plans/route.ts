import { NextResponse, NextRequest } from 'next/server';
import { getPlans, savePlans } from '@/server/db';
import type { MembershipPlan } from '@/lib/types';

// Returns the gym's membership plans so customers can subscribe via the portal.
export async function GET() {
  try {
    return NextResponse.json({ ok: true, plans: getPlans() });
  } catch (e) {
    console.error('plans error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

// Persist the gym's membership plans so they become available on the customer
// portal. Called automatically whenever plans change in management (and via the
// manual "publish" button), so defining a plan is enough — no per-customer sync
// is required for plans to appear.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = Array.isArray(body.plans) ? body.plans : [];
    const plans: MembershipPlan[] = raw.map((p: any) => ({
      id: p.id || `plan-${Date.now()}`,
      name: p.name || 'پلن',
      category: p.category || 'regular',
      period: p.period || 'monthly',
      price: Number(p.price) || 0,
      description: p.description || '',
      status: p.status || 'active',
    }));
    savePlans(plans);
    return NextResponse.json({ ok: true, count: plans.length });
  } catch (e) {
    console.error('plans save error', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
