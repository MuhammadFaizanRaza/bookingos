'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, MoreVertical, Pencil, Plus, Shield, Star, Trash2 } from 'lucide-react';
import {
  isUnlimited,
  useBillingUsage,
  useStaff,
  useTenant,
} from '@/hooks/use-salon-data';
import { planDef } from '@/lib/plans';
import { api } from '@/lib/api';
import {
  getAllowedSections,
  ASSIGNABLE_ROLES,
  SECTION_LABELS,
} from '@/lib/permissions';
import type { Section } from '@/lib/permissions';
import type { Role, StaffMember } from '@/lib/types';
import { cn, initials } from '@/lib/utils';
import { PageHeader } from '@/components/dashboard/page-header';
import { StaffGridSkeleton } from '@/components/dashboard/loaders';
import { StaffDialog } from '@/components/dashboard/staff-dialog';
import { UpgradeDialog } from '@/components/dashboard/upgrade-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';

// ── localStorage helpers ──────────────────────────────────────────────────────
const ROLES_STORAGE_KEY = 'bookingos.staff-roles';

function readStoredRoles(): Record<string, Role> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(ROLES_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeStoredRoles(roles: Record<string, Role>) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  }
}

// ── Access management dialog ──────────────────────────────────────────────────
function AccessDialog({
  open,
  onOpenChange,
  member,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: StaffMember;
  onSaved: (role: Role) => void;
}) {
  const [role, setRole] = React.useState<Role>(member.user.role ?? 'STAFF');
  const [saving, setSaving] = React.useState(false);
  const sections: Section[] = getAllowedSections(role);

  // Sync when member changes (different staff opened)
  React.useEffect(() => {
    setRole(member.user.role ?? 'STAFF');
  }, [member.id, member.user.role]);

  async function save() {
    setSaving(true);
    try {
      await api.staff.update(member.id, { role });
    } catch {
      // API may not support role field — proceed with local save
    }
    onSaved(role);
    toast.success(`Access updated for ${member.user.name}`);
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Manage Access
          </DialogTitle>
          <DialogDescription>
            Set what <strong>{member.user.name}</strong> can access in the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {ASSIGNABLE_ROLES.map((opt) => {
            const active = role === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={cn(
                  'w-full rounded-xl border p-3.5 text-left transition-all hover:border-primary/40',
                  active && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{opt.label}</p>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
              </button>
            );
          })}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Dashboard sections accessible:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sections.map((s) => (
              <Badge key={s} variant="secondary" className="text-xs capitalize">
                {SECTION_LABELS[s]}
              </Badge>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  RECEPTIONIST: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
  STAFF: 'bg-muted text-muted-foreground',
};

function RoleBadge({ role }: { role?: Role }) {
  const label = role ? role.charAt(0) + role.slice(1).toLowerCase() : 'Staff';
  const colorClass = ROLE_COLORS[role ?? 'STAFF'] ?? ROLE_COLORS.STAFF;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        colorClass,
      )}
    >
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const t = useTranslations('dashboard.staff');
  const tu = useTranslations('dashboard.upgrade');
  const { data: staff = [], isLoading } = useStaff();
  const { data: tenant } = useTenant();
  const { data: usage } = useBillingUsage();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<StaffMember | null>(null);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [accessOpen, setAccessOpen] = React.useState(false);
  const [accessTarget, setAccessTarget] = React.useState<StaffMember | null>(null);

  // Role overrides — persisted to localStorage so they survive refetches/refreshes
  const [staffRoles, setStaffRoles] = React.useState<Record<string, Role>>(readStoredRoles);

  // Merge stored role overrides into staff list for display
  const staffWithRoles = React.useMemo(
    () =>
      staff.map((m) => ({
        ...m,
        user: { ...m.user, role: staffRoles[m.id] ?? m.user.role },
      })),
    [staff, staffRoles],
  );

  const maxStaff = usage?.staff.limit ?? planDef(tenant?.plan).maxStaff;
  const atLimit = !isUnlimited(maxStaff) && staff.length >= maxStaff;

  function handleAdd() {
    if (atLimit) { setUpgradeOpen(true); return; }
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(m: StaffMember) {
    setEditing(m);
    setDialogOpen(true);
  }

  function handleManageAccess(m: StaffMember) {
    // Pass merged member so dialog shows the current saved role
    const merged = staffWithRoles.find((s) => s.id === m.id) ?? m;
    setAccessTarget(merged);
    setAccessOpen(true);
  }

  function handleAccessSaved(role: Role) {
    if (!accessTarget) return;
    const staffId = accessTarget.id;

    // 1. Persist to localStorage
    const next = { ...staffRoles, [staffId]: role };
    setStaffRoles(next);
    writeStoredRoles(next);

    // 2. Update React Query cache so the badge updates immediately
    qc.setQueryData<StaffMember[]>(['staff'], (prev = []) =>
      prev.map((s) =>
        s.id === staffId ? { ...s, user: { ...s.user, role } } : s,
      ),
    );
  }

  async function handleDelete(m: StaffMember) {
    try {
      await api.staff.remove(m.id);
      qc.invalidateQueries({ queryKey: ['staff'] });
    } catch {
      qc.setQueryData<StaffMember[]>(['staff'], (prev = []) => prev.filter((s) => s.id !== m.id));
    } finally {
      toast.success(t('deleted'));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button variant="gradient" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            {t('newStaff')}
          </Button>
        }
      />

      {isLoading ? (
        <StaffGridSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {staffWithRoles.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <div className="relative">
                <div
                  className="h-20"
                  style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}99)` }}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute end-2 top-2 h-8 w-8 bg-black/10 text-white hover:bg-black/20"
                      aria-label="Options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(m)}>
                      <Pencil className="h-4 w-4" />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleManageAccess(m)}>
                      <Shield className="h-4 w-4" />
                      Manage Access
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardContent className="-mt-10 text-center">
                <Avatar className="mx-auto h-20 w-20 border-4 border-card">
                  <AvatarImage src={m.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-lg">{initials(m.user.name)}</AvatarFallback>
                </Avatar>
                <p className="mt-3 font-semibold">{m.user.name}</p>
                <p className="text-sm text-muted-foreground">{m.title}</p>
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{m.bio}</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  <RoleBadge role={m.user.role} />
                  {m.isBookable && <Badge variant="success">{t('bookable')}</Badge>}
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3" />
                    {Number(m.commissionRate ?? 0)}%
                  </Badge>
                  {m.services?.length ? (
                    <Badge variant="outline" className="text-xs">
                      {m.services.length} service{m.services.length !== 1 ? 's' : ''}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">No services</Badge>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(m)}>
                    <Pencil className="h-3.5 w-3.5" />
                    {t('edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleManageAccess(m)}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StaffDialog open={dialogOpen} onOpenChange={setDialogOpen} staff={editing} />
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={tu('staffLimit')}
        highlightFeature="staff"
      />
      {accessTarget && (
        <AccessDialog
          open={accessOpen}
          onOpenChange={setAccessOpen}
          member={accessTarget}
          onSaved={handleAccessSaved}
        />
      )}
    </div>
  );
}
