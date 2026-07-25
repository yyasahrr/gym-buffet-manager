import { NextResponse } from 'next/server';
import { findMemberByToken, findMemberById, getInvoicesForMember } from '@/server/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const cookieId = req.cookies.get('portalMember')?.value;

  const member = token ? findMemberByToken(token) : cookieId ? findMemberById(cookieId) : undefined;
  if (!member) return NextResponse.json({ error: 'عضو یافت نشد' }, { status: 404 });

  const invoices = getInvoicesForMember(member.id).map((i) => ({
    id: i.id,
    title: i.title,
    total: i.total,
    isInstallment: i.isInstallment,
    installments: i.installments,
    status: i.status,
  }));

  return NextResponse.json({
    ok: true,
    member: { id: member.id, name: member.name, hasLogin: Boolean(member.username) },
    invoices,
  });
}
