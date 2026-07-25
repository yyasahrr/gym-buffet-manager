'use client';

import { useActiveRole, ROLE_LABELS, roleLabel } from '@/lib/rbac';
import { getSession } from '@/lib/management-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck } from 'lucide-react';

const ROLES = Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[];

export function RoleSwitcher() {
  const [role, setRole] = useActiveRole();
  // وقتی با حساب کاربریِ واقعی (مسئول) وارد شده‌ایم، نقش توسط حساب تعیین می‌شود
  // و سوئیچر غیرفعال می‌شود تا دسترسی‌ها واقعی بمانند (پیش‌نمایش فقط در حالت PIN/بدون حساب).
  const isRealUser = !!getSession()?.userId;

  if (isRealUser) {
    return (
      <div className="rounded-md bg-muted/40 p-2 text-sm">
        <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> نقش شما
        </div>
        <div className="text-xs font-medium">{roleLabel(role)}</div>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-muted/40 p-2 text-sm">
      <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> نقش فعال (پیش‌نمایش دسترسی)
      </div>
      <Select value={role} onValueChange={(v) => setRole(v as keyof typeof ROLE_LABELS)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue>{roleLabel(role)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
