'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { addDays, format, isSameDay } from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Loader2,
  Plus,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppointments, useServices, useStaff } from '@/hooks/use-salon-data';
import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import type { Appointment, AppointmentStatus, StaffMember } from '@/lib/types';
import { cn, minutesToLabel } from '@/lib/utils';
import { PageHeader } from '@/components/dashboard/page-header';
import { CalendarSkeleton } from '@/components/dashboard/loaders';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { initials } from '@/lib/utils';

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_PX = 80;   // pixels per hour
const COL_MIN_W = 180; // minimum staff column width in px

// ── Status styles ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING:     'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CONFIRMED:   'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  CHECKED_IN:  'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  IN_PROGRESS: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  COMPLETED:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  CANCELLED:   'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  NO_SHOW:     'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  PENDING:     'bg-amber-400',
  CONFIRMED:   'bg-blue-500',
  CHECKED_IN:  'bg-violet-500',
  IN_PROGRESS: 'bg-orange-500',
  COMPLETED:   'bg-emerald-500',
  CANCELLED:   'bg-red-400',
  NO_SHOW:     'bg-gray-400',
};

const NEXT_STATUSES: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  PENDING:     ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED:   ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN:  ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_STYLES[status])}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ── New Appointment Dialog ────────────────────────────────────────────────────
function NewAppointmentDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultTime,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: Date;
  defaultTime?: string;
}) {
  const qc = useQueryClient();
  const { data: services = [] } = useServices();
  const { data: staff = [] } = useStaff();

  const [clientId, setClientId] = React.useState<string | undefined>();
  const [clientName, setClientName] = React.useState('');
  const [clientEmail, setClientEmail] = React.useState('');
  const [clientPhone, setClientPhone] = React.useState('');
  const [serviceId, setServiceId] = React.useState('');
  const [staffId, setStaffId] = React.useState('__any__');
  const [date, setDate] = React.useState(format(defaultDate, 'yyyy-MM-dd'));
  const [time, setTime] = React.useState(defaultTime ?? '09:00');
  const [saving, setSaving] = React.useState(false);
  const [lookingUp, setLookingUp] = React.useState(false);
  const emailTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setDate(format(defaultDate, 'yyyy-MM-dd'));
  }, [defaultDate]);

  React.useEffect(() => {
    if (defaultTime) setTime(defaultTime);
  }, [defaultTime]);

  function handleClose(v: boolean) {
    if (!v) {
      setClientId(undefined); setClientName(''); setClientEmail(''); setClientPhone('');
      setServiceId(''); setStaffId('__any__');
      setDate(format(defaultDate, 'yyyy-MM-dd')); setTime(defaultTime ?? '09:00');
    }
    onOpenChange(v);
  }

  function handleEmailChange(email: string) {
    setClientEmail(email);
    setClientId(undefined);
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (!email.includes('@')) return;
    emailTimer.current = setTimeout(async () => {
      setLookingUp(true);
      try {
        const res = await api.clients.list({ q: email, pageSize: 5 });
        const match = res.data.find((c) => c.email?.toLowerCase() === email.toLowerCase());
        if (match) {
          setClientId(match.id);
          setClientName(match.name);
          if (match.phone) setClientPhone(match.phone);
        }
      } catch { /* ignore */ } finally {
        setLookingUp(false);
      }
    }, 500);
  }

  async function save() {
    if (!clientName || !serviceId) return;
    setSaving(true);
    try {
      const startsAt = new Date(`${date}T${time}:00`).toISOString();
      let resolvedClientId = clientId;
      if (!resolvedClientId) {
        try {
          const client = await api.clients.create({
            name: clientName,
            email: clientEmail || undefined,
            phone: clientPhone || undefined,
          });
          resolvedClientId = client.id;
        } catch { /* proceed without clientId */ }
      }
      await api.bookings.create({
        clientId: resolvedClientId,
        items: [{ serviceId, staffId: staffId !== '__any__' ? staffId : undefined, startsAt }],
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['appointments'] }),
        qc.invalidateQueries({ queryKey: ['availability'] }),
      ]);
      toast.success('Appointment created');
      handleClose(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create appointment';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Client Email</Label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="Enter email to find existing client"
                  value={clientEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                />
                {lookingUp && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {clientId && <p className="text-xs text-emerald-600">Existing client found — details auto-filled</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Client Name *</Label>
              <Input placeholder="Walk-in client" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="optional" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Service *</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
              <SelectContent>
                {services.filter((s) => s.isActive).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Staff</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any available</SelectItem>
                {staff.filter((m) => m.isBookable).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={save} disabled={!clientName || !serviceId || saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Status update dropdown ───────────────────────────────────────────────────
function StatusDropdown({ appointment, onUpdated }: { appointment: Appointment; onUpdated: () => void }) {
  const [loading, setLoading] = React.useState(false);
  const nexts = NEXT_STATUSES[appointment.status as AppointmentStatus];
  if (!nexts?.length) return <StatusBadge status={appointment.status as AppointmentStatus} />;

  async function update(status: AppointmentStatus) {
    setLoading(true);
    try {
      await api.bookings.updateStatus(appointment.id, status);
      onUpdated();
      toast.success(`Status updated to ${status.replace('_', ' ').toLowerCase()}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={loading} className="flex items-center gap-1">
          <StatusBadge status={appointment.status as AppointmentStatus} />
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {nexts.map((s) => (
          <DropdownMenuItem key={s} onClick={() => update(s)}>
            <StatusBadge status={s} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── List view ────────────────────────────────────────────────────────────────
function AppointmentListView({ appointments, onRefresh }: { appointments: Appointment[]; onRefresh: () => void }) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">No appointments for this day</p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">Client</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">Service</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">Specialist</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">Duration</th>
              <th className="px-4 py-3 text-start font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                <td className="px-4 py-3 font-medium tabular-nums">
                  {format(new Date(a.startsAt), 'HH:mm')}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{a.client?.name ?? 'Walk-in'}</span>
                  {a.client?.phone && <p className="text-xs text-muted-foreground">{a.client.phone}</p>}
                </td>
                <td className="px-4 py-3">{a.items.map((it) => it.service?.name ?? '—').join(', ')}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {a.items.map((it) =>
                      it.staff ? (
                        <span key={it.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: it.staff.color }} />
                          {it.staff.user.name}
                        </span>
                      ) : null,
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {minutesToLabel(a.items.reduce((s, it) => s + it.durationMin, 0))}
                </td>
                <td className="px-4 py-3">
                  <StatusDropdown appointment={a} onUpdated={onRefresh} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Calendar grid view ───────────────────────────────────────────────────────
function CalendarGridView({
  staff,
  dayAppointments,
  selectedDay,
  onSlotClick,
}: {
  staff: StaffMember[];
  dayAppointments: Appointment[];
  selectedDay: Date;
  onSlotClick: (time: string) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const totalH = hours.length * HOUR_PX;
  const isToday = isSameDay(selectedDay, new Date());

  // Current time position + label
  const [nowPx, setNowPx] = React.useState<number | null>(null);
  const [nowLabel, setNowLabel] = React.useState('');
  React.useEffect(() => {
    if (!isToday) { setNowPx(null); return; }
    function calc() {
      const now = new Date();
      const mins = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
      setNowPx(Math.max(0, mins * (HOUR_PX / 60)));
      setNowLabel(format(now, 'HH:mm'));
    }
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [isToday]);

  // Auto-scroll to current time (or 8 AM) on first render
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targetPx = nowPx != null
      ? Math.max(0, nowPx - 120)
      : (8 - START_HOUR) * HOUR_PX;
    el.scrollTop = targetPx;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  function positionFor(startsAt: string, endsAt: string) {
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    const top = ((s.getHours() - START_HOUR) * 60 + s.getMinutes()) * (HOUR_PX / 60);
    const height = ((e.getTime() - s.getTime()) / 60_000) * (HOUR_PX / 60);
    return { top, height: Math.max(height, 28) };
  }

  function handleCellClick(e: React.MouseEvent<HTMLDivElement>, columnEl: HTMLDivElement) {
    const rect = columnEl.getBoundingClientRect();
    const scrollParent = scrollRef.current;
    const scrollTop = scrollParent ? scrollParent.scrollTop : 0;
    const y = e.clientY - rect.top + scrollTop;
    const totalMins = (y / HOUR_PX) * 60;
    const hour = START_HOUR + Math.floor(totalMins / 60);
    const min = Math.round((totalMins % 60) / 15) * 15; // snap to 15min
    const hh = String(Math.min(hour, 23)).padStart(2, '0');
    const mm = String(Math.min(min, 59)).padStart(2, '0');
    onSlotClick(`${hh}:${mm}`);
  }

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">No staff configured yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Add staff members to see their schedules</p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      {/* Scrollable wrapper */}
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ maxHeight: 'calc(100vh - 260px)' }}
      >
        <div style={{ minWidth: `${64 + staff.length * COL_MIN_W}px` }}>

          {/* ── Sticky header row (staff names) ── */}
          <div className="sticky top-0 z-30 flex border-b bg-card/95 backdrop-blur-sm shadow-sm">
            {/* Corner cell */}
            <div className="sticky left-0 z-40 w-16 shrink-0 border-r bg-card/95" />
            {/* Staff columns header */}
            {staff.map((m) => {
              const count = dayAppointments.filter((a) =>
                a.items.some((it) => it.staffId === m.id),
              ).length;
              return (
                <div
                  key={m.id}
                  className="flex flex-1 items-center gap-3 border-r px-3 py-3 last:border-r-0"
                  style={{ minWidth: COL_MIN_W }}
                >
                  <Avatar className="h-8 w-8 shrink-0 ring-2 ring-offset-1" style={{ ['--tw-ring-color' as string]: m.color } as React.CSSProperties}>
                    <AvatarImage src={m.user.avatarUrl ?? undefined} />
                    <AvatarFallback
                      className="text-[11px] font-bold text-white"
                      style={{ background: m.color }}
                    >
                      {initials(m.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{m.user.name}</p>
                    {m.title && <p className="truncate text-[11px] text-muted-foreground">{m.title}</p>}
                  </div>
                  {count > 0 && (
                    <Badge
                      className="h-5 shrink-0 px-1.5 text-[10px] text-white"
                      style={{ backgroundColor: m.color }}
                    >
                      {count}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Grid body ── */}
          <div className="flex">
            {/* Sticky time gutter */}
            <div className="sticky left-0 z-20 w-16 shrink-0 border-r bg-card">
              {/* "Now" label that floats at current time */}
              {isToday && nowPx != null && nowPx >= 0 && nowPx <= totalH && (
                <div
                  className="pointer-events-none absolute right-0 z-30 flex items-center justify-end pr-1.5"
                  style={{ top: nowPx - 9 }}
                >
                  <span className="rounded bg-red-500 px-1 py-px text-[9px] font-bold text-white tabular-nums leading-tight">
                    {nowLabel}
                  </span>
                </div>
              )}
              {hours.map((h, i) => (
                <div
                  key={h}
                  className={cn('relative border-b', i % 2 === 0 ? 'bg-card' : 'bg-muted/20')}
                  style={{ height: HOUR_PX }}
                >
                  <span className="absolute -top-2.5 right-2 select-none text-[11px] tabular-nums text-muted-foreground/70">
                    {h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Staff columns */}
            {staff.map((m) => {
              const colAppts = dayAppointments.filter((a) =>
                a.items.some((it) => it.staffId === m.id),
              );
              return (
                <div
                  key={m.id}
                  className="group relative flex-1 cursor-crosshair border-r last:border-r-0"
                  style={{ minWidth: COL_MIN_W, height: totalH }}
                  onClick={(e) => handleCellClick(e, e.currentTarget)}
                >
                  {/* Hour rows with alternating shade */}
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className={cn('border-b', i % 2 === 0 ? '' : 'bg-muted/10')}
                      style={{ height: HOUR_PX }}
                    >
                      {/* 30-min sub-line */}
                      <div
                        className="border-b border-dashed border-border/50"
                        style={{ height: HOUR_PX / 2 }}
                      />
                    </div>
                  ))}

                  {/* Hover overlay: shows "+" hint when hovering empty areas */}
                  <div className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="h-full w-full" style={{ background: `${m.color}08` }} />
                  </div>

                  {/* Current time indicator (today only) */}
                  {isToday && nowPx != null && nowPx >= 0 && nowPx <= totalH && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                      style={{ top: nowPx }}
                    >
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-sm shadow-red-400"
                        style={{ marginLeft: -5 }}
                      />
                      <div className="h-[1.5px] flex-1 bg-red-500 opacity-80" />
                    </div>
                  )}

                  {/* Appointment blocks */}
                  {colAppts.map((a) => {
                    const item = a.items.find((it) => it.staffId === m.id);
                    if (!item) return null;
                    const pos = positionFor(item.startsAt, item.endsAt);
                    const status = a.status as AppointmentStatus;
                    const medium = pos.height >= 50;
                    const tall = pos.height >= 70;
                    const veryTall = pos.height >= 100;
                    return (
                      <div
                        key={a.id}
                        className="absolute z-20 cursor-pointer overflow-hidden rounded-md shadow-sm transition-all hover:z-30 hover:shadow-md hover:brightness-95"
                        style={{
                          top: pos.top + 2,
                          height: pos.height - 4,
                          left: 3,
                          right: 3,
                          borderLeft: `3px solid ${m.color}`,
                          backgroundColor: `${m.color}18`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Colored top strip */}
                        <div
                          className="absolute inset-x-0 top-0 h-0.5"
                          style={{ backgroundColor: m.color, opacity: 0.5 }}
                        />
                        <div className="flex h-full flex-col justify-start px-1.5 py-1">
                          {/* Time */}
                          <span className="tabular-nums text-[10px] font-medium leading-tight text-muted-foreground/80">
                            {format(new Date(item.startsAt), 'HH:mm')}
                            {medium && ` – ${format(new Date(item.endsAt), 'HH:mm')}`}
                          </span>
                          {/* Client name */}
                          <p
                            className="truncate text-[12px] font-bold leading-snug"
                            style={{ color: m.color }}
                          >
                            {a.client?.name ?? 'Walk-in'}
                          </p>
                          {/* Service */}
                          {tall && (
                            <p className="truncate text-[11px] leading-tight text-foreground/70">
                              {item.service?.name}
                            </p>
                          )}
                          {/* Status + duration */}
                          {veryTall && (
                            <div className="mt-auto flex items-center gap-1.5 pt-1">
                              <span
                                className={cn(
                                  'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                                  STATUS_STYLES[status],
                                )}
                              >
                                <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
                                {status.replace('_', ' ')}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {minutesToLabel(item.durationMin)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const t = useTranslations('dashboard.calendar');
  const { user } = useAuth();
  const qc = useQueryClient();

  const [day, setDay] = React.useState(new Date());
  const [view, setView] = React.useState<'calendar' | 'list'>('calendar');
  const [newApptOpen, setNewApptOpen] = React.useState(false);
  const [newApptTime, setNewApptTime] = React.useState<string | undefined>();

  const dateStr = format(day, 'yyyy-MM-dd');
  const { data: allStaff = [], isLoading: staffLoading } = useStaff();
  const { data: appointments = [], isLoading: apptLoading } = useAppointments({
    from: dateStr,
    to: dateStr,
  });
  const isLoading = staffLoading || apptLoading;

  const isStaff = user?.role === 'STAFF';
  const myProfile = isStaff ? allStaff.find((m) => m.user.id === user?.id) : null;
  const visibleStaff = myProfile ? [myProfile] : allStaff;

  const dayAppointments = appointments.filter((a) => isSameDay(new Date(a.startsAt), day));
  const visibleAppointments = myProfile
    ? dayAppointments.filter((a) => a.items.some((it) => it.staffId === myProfile.id))
    : dayAppointments;

  function openNewAppt(time?: string) {
    setNewApptTime(time);
    setNewApptOpen(true);
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ['appointments'] });
  }

  const isToday = isSameDay(day, new Date());

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button variant="gradient" onClick={() => openNewAppt()}>
            <Plus className="h-4 w-4" />
            {t('newAppointment')}
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date navigation */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDay((d) => addDays(d, -1))}>
            <ChevronLeft className="ltr-flip h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDay(new Date())}
            className={cn('h-8 text-xs', isToday && 'border-primary bg-primary/5 text-primary font-semibold')}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDay((d) => addDays(d, 1))}>
            <ChevronRight className="ltr-flip h-4 w-4" />
          </Button>
        </div>

        {/* Date display */}
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold leading-tight">
            {format(day, 'EEEE, MMMM d')}
          </span>
          <span className="text-sm text-muted-foreground">{format(day, 'yyyy')}</span>
          {isToday && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              Today
            </span>
          )}
        </div>

        {/* Appointment count */}
        {!isLoading && visibleAppointments.length > 0 && (
          <span className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
            {visibleAppointments.length} appointment{visibleAppointments.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* View toggle */}
        <div className="ms-auto flex items-center rounded-lg border bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => setView('calendar')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all',
              view === 'calendar' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-all',
              view === 'list' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
        </div>
      </div>

      {/* Main content */}
      {isLoading ? (
        <CalendarSkeleton />
      ) : view === 'list' ? (
        <AppointmentListView appointments={visibleAppointments} onRefresh={refresh} />
      ) : (
        <CalendarGridView
          staff={visibleStaff}
          dayAppointments={visibleAppointments}
          selectedDay={day}
          onSlotClick={openNewAppt}
        />
      )}

      <NewAppointmentDialog
        open={newApptOpen}
        onOpenChange={setNewApptOpen}
        defaultDate={day}
        defaultTime={newApptTime}
      />
    </div>
  );
}
