'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { usePublicServices, usePublicStaff, useAvailability } from '@/hooks/use-salon-data';
import { api } from '@/lib/api';
import { mockTenant } from '@/lib/mock';
import type { Service, Slot, StaffMember, Tenant } from '@/lib/types';
import { cn, formatCurrency, initials, minutesToLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { PaymentStep } from './payment-step';

type StepId = 'service' | 'staff' | 'time' | 'details' | 'review' | 'payment';

const STEP_LABELS: Record<StepId, string> = {
  service: 'Service',
  staff: 'Specialist',
  time: 'Date & Time',
  details: 'Your Info',
  review: 'Review',
  payment: 'Payment',
};

interface ReservePageProps {
  slug: string;
  preSelectedServiceId?: string;
  preSelectedStaffId?: string;
  salon?: Tenant;
}

export function ReservePage({ slug, preSelectedServiceId, preSelectedStaffId, salon }: ReservePageProps) {
  const locale = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const [salonData, setSalonData] = React.useState<Tenant>(salon ?? mockTenant);
  const currency = salonData.currency;

  React.useEffect(() => {
    if (!salon) {
      api.public.getSite(slug).then(setSalonData).catch(() => {});
    }
  }, [slug, salon]);

  const { data: services = [], isLoading: servicesLoading } = usePublicServices(slug);
  const { data: staff = [], isLoading: staffLoading } = usePublicStaff(slug);

  const [step, setStep] = React.useState<StepId>('service');
  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    preSelectedServiceId ? [preSelectedServiceId] : [],
  );
  const [staffId, setStaffId] = React.useState<string | null>(preSelectedStaffId ?? null);
  const [date, setDate] = React.useState<Date>(addDays(new Date(), 1));
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const [details, setDetails] = React.useState({ name: '', email: '', phone: '', notes: '' });
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const selected = services.filter((s) => selectedIds.includes(s.id));
  const totalPrice = selected.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selected.reduce((sum, s) => sum + s.durationMin, 0);
  const depositAmount = selected.reduce((s, svc) => s + (svc.depositRequired ? Number(svc.depositAmount ?? 0) : 0), 0);
  const requiresPayment = depositAmount > 0;

  const dateStr = format(date, 'yyyy-MM-dd');
  const { data: rawSlots = [], isLoading: slotsLoading, isError: slotsError } = useAvailability({
    serviceId: selectedIds[0],
    date: dateStr,
    staffId: staffId ?? undefined,
    slug,
    enabled: step === 'time' && selectedIds.length > 0,
  });
  // Deduplicate by start time. For each time, prefer the slot where available:true
  // (i.e. at least one staff is free). This drives the gray-out logic below.
  const slots = React.useMemo(() => {
    const map = new Map<string, Slot>();
    for (const s of rawSlots) {
      const existing = map.get(s.start);
      if (!existing || (!existing.available && s.available)) {
        map.set(s.start, s);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.start.localeCompare(b.start));
  }, [rawSlots]);

  // If the selected slot becomes blocked after a cache refresh (someone else booked it),
  // deselect it and warn the user.
  React.useEffect(() => {
    if (!slot) return;
    const refreshed = slots.find((s) => s.start === slot.start);
    if (refreshed?.available === false) {
      setSlot(null);
      toast.error('Selected slot was just taken. Please choose another time.');
    }
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  const allSteps: StepId[] = requiresPayment
    ? ['service', 'staff', 'time', 'details', 'review', 'payment']
    : ['service', 'staff', 'time', 'details', 'review'];
  const stepIndex = allSteps.indexOf(step);

  function goNext() { const n = allSteps[stepIndex + 1]; if (n) setStep(n); }
  function goBack() {
    if (stepIndex === 0) { router.push(`/${locale}/${slug}`); return; }
    const p = allSteps[stepIndex - 1]; if (p) setStep(p);
  }
  function toggleService(id: string) {
    setSelectedIds((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  }

  const canContinue =
    (step === 'service' && selectedIds.length > 0) ||
    step === 'staff' ||
    (step === 'time' && !!slot && slot.available !== false) ||
    (step === 'details' && details.name && details.email) ||
    step === 'review';

  async function submit() {
    // Guard: slot must still be available (could have been taken while user filled details)
    if (!slot || slot.available === false) {
      toast.error('This slot is no longer available. Please choose another time.');
      setSlot(null);
      setStep('time');
      return;
    }
    setSubmitting(true);
    try {
      await api.public.createBooking(slug, {
        name: details.name,
        email: details.email || undefined,
        phone: details.phone || undefined,
        notes: details.notes || undefined,
        items: selectedIds.map((serviceId) => ({
          serviceId,
          staffId: effectiveStaffId ?? undefined,
          startsAt: slot?.start ?? new Date(date).toISOString(),
        })),
      });
      // Bust the availability cache so the booked slot disappears immediately
      await qc.invalidateQueries({ queryKey: ['availability'] });
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Booking failed. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSelectedIds([]); setStaffId(null); setSlot(null);
    setDetails({ name: '', email: '', phone: '', notes: '' });
    setDone(false); setStep('service');
  }

  const primaryColor = salonData.primaryColor;
  const logoInitials = salonData.name.slice(0, 2).toUpperCase();
  // Only trust slot.staffId when it actually exists in the real staff list.
  // Mock/stale staffIds (e.g. "stf_3") would otherwise ghost the specialist panel.
  const slotStaffId = slot?.staffId && staff.some((m) => m.id === slot.staffId)
    ? slot.staffId
    : null;
  const effectiveStaffId = slotStaffId ?? staffId ?? null;
  const currentStaff = staff.find((m) => m.id === effectiveStaffId);

  // ── Shared left panel (desktop) ─────────────────────────────────────────
  const LeftPanel = (
    <aside
      className="hidden lg:flex lg:w-[360px] lg:shrink-0 lg:flex-col lg:h-screen lg:overflow-y-auto"
      style={{ background: `linear-gradient(160deg, ${primaryColor}f5 0%, ${primaryColor}cc 100%)` }}
    >
      {/* Back */}
      <div className="px-8 pt-8">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/${slug}`)}
          className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {salonData.name}
        </button>
      </div>

      {/* Salon identity */}
      <div className="px-8 pt-8">
        {salonData.logoUrl ? (
          <img
            src={salonData.logoUrl}
            alt={salonData.name}
            className="h-14 w-14 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white shadow-lg backdrop-blur-sm">
            {logoInitials}
          </span>
        )}
        <h1 className="mt-4 text-2xl font-bold text-white">{salonData.name}</h1>
        <p className="text-sm text-white/60">Book your appointment</p>
      </div>

      <div className="mx-8 mt-8 h-px bg-white/15" />

      {/* Booking summary */}
      <div className="flex-1 px-8 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
          Booking Summary
        </p>

        {selected.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white/10 p-4 text-center">
            <p className="text-sm text-white/50">Select a service to begin</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {selected.map((svc) => (
              <div
                key={svc.id}
                className="flex items-center justify-between rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{svc.name}</p>
                  <p className="text-xs text-white/50">{minutesToLabel(svc.durationMin)}</p>
                </div>
                <span className="ml-3 shrink-0 text-sm font-semibold text-white">
                  {formatCurrency(Number(svc.price), currency, locale)}
                </span>
              </div>
            ))}

            <div className="mt-3 rounded-xl bg-white/15 px-3.5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Total</span>
                <span className="font-display text-xl font-bold text-white">
                  {formatCurrency(totalPrice, currency, locale)}
                </span>
              </div>
              {totalDuration > 0 && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-white/50">Duration</span>
                  <span className="text-xs text-white/70">{minutesToLabel(totalDuration)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Slot */}
        {slot && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2.5">
            <CalendarIcon className="h-4 w-4 shrink-0 text-white/60" />
            <div>
              <p className="text-[10px] text-white/50">Date & Time</p>
              <p className="text-sm font-medium text-white">
                {format(new Date(slot.start), 'EEE, MMM d · HH:mm')}
              </p>
            </div>
          </div>
        )}

        {/* Specialist */}
        {currentStaff && (
          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2.5">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={currentStaff.user.avatarUrl ?? undefined} />
              <AvatarFallback className="text-[10px]" style={{ background: currentStaff.color }}>
                {initials(currentStaff.user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[10px] text-white/50">Specialist</p>
              <p className="text-sm font-medium text-white">{currentStaff.user.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Trust badges */}
      <div className="border-t border-white/15 px-8 py-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Shield className="h-3.5 w-3.5" />
            <span>Secure & encrypted booking</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Free cancellation 24h before</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Star className="h-3.5 w-3.5 fill-white/30 text-white/50" />
            <span>Trusted by thousands of clients</span>
          </div>
        </div>
      </div>
    </aside>
  );

  // ── Success screen ───────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex h-screen overflow-hidden">
        {LeftPanel}
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-muted/30 p-6">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h1 className="mt-6 font-display text-3xl font-bold">You&apos;re booked!</h1>
            <p className="mt-2 text-muted-foreground">
              We&apos;ll send a confirmation to {details.email || 'you'} shortly.
            </p>
            <div className="mt-6 rounded-2xl border bg-card p-5 text-left shadow-sm">
              {selected.map((s) => (
                <div key={s.id} className="flex justify-between border-b py-2 text-sm last:border-0">
                  <span>{s.name}</span>
                  <span className="font-medium">{formatCurrency(Number(s.price), currency, locale)}</span>
                </div>
              ))}
              {slot && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {format(new Date(slot.start), 'EEEE, MMMM d · HH:mm')}
                </p>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Book Another</Button>
              <Button className="flex-1" onClick={() => router.push(`/${locale}/${slug}`)}>
                Back to Salon
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main booking flow ────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden">
      {LeftPanel}

      {/* RIGHT PANEL */}
      <div className="flex flex-1 flex-col overflow-hidden bg-muted/30 lg:bg-background">
        {/* Mobile top bar */}
        <div className="border-b bg-background/90 backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <button
              type="button"
              onClick={() => router.push(`/${locale}/${slug}`)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {salonData.name}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-xl px-4 py-8 lg:py-16">
            {/* Mobile branding */}
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ background: primaryColor }}
              >
                {logoInitials}
              </span>
              <div>
                <p className="font-semibold">{salonData.name}</p>
                <p className="text-xs text-muted-foreground">Book an appointment</p>
              </div>
            </div>

            {/* Main card */}
            <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
              {/* Step progress */}
              <div className="border-b px-6 pt-5 pb-4">
                <div className="flex items-center gap-1.5">
                  {allSteps.map((s, i) => (
                    <React.Fragment key={s}>
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all',
                            i < stepIndex && 'bg-primary text-white',
                            i === stepIndex && 'bg-primary text-white shadow-md ring-4 ring-primary/20',
                            i > stepIndex && 'bg-muted text-muted-foreground',
                          )}
                        >
                          {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <span
                          className={cn(
                            'hidden text-[10px] font-medium sm:block',
                            i === stepIndex ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {STEP_LABELS[s]}
                        </span>
                      </div>
                      {i < allSteps.length - 1 && (
                        <div className={cn('mb-3 h-px flex-1', i < stepIndex ? 'bg-primary' : 'bg-border')} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Step content */}
              <div className="p-6">
                {/* ── Service step ─────────────────────────────── */}
                {step === 'service' && (
                  <StepShell title="Choose a service" desc="Select one or more services to book">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {servicesLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-2xl" />
                          ))
                        : services.map((svc) => {
                            const active = selectedIds.includes(svc.id);
                            return (
                              <button
                                key={svc.id}
                                type="button"
                                onClick={() => toggleService(svc.id)}
                                className={cn(
                                  'group relative rounded-2xl border bg-background p-4 text-left transition-all hover:shadow-sm',
                                  active && 'border-primary ring-2 ring-primary/25',
                                )}
                              >
                                <div
                                  className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl"
                                  style={{ background: svc.color }}
                                />
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">{svc.name}</p>
                                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                      {svc.description}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                                      active ? 'border-primary bg-primary text-white' : 'border-border',
                                    )}
                                  >
                                    {active && <Check className="h-3 w-3" />}
                                  </span>
                                </div>
                                <div className="mt-3 flex items-center gap-3 text-xs">
                                  <span className="font-bold text-primary">
                                    {formatCurrency(Number(svc.price), currency, locale)}
                                  </span>
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {minutesToLabel(svc.durationMin)}
                                  </span>
                                  {svc.depositRequired && (
                                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                                      Deposit
                                    </Badge>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                    </div>
                  </StepShell>
                )}

                {/* ── Specialist step ───────────────────────────── */}
                {step === 'staff' && (
                  <StepShell title="Choose a specialist" desc="Pick your preferred specialist or let us assign one">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setStaffId(null)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border bg-background p-3.5 text-left transition-all hover:shadow-sm',
                          staffId === null && 'border-primary ring-2 ring-primary/25',
                        )}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Sparkles className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">Any Specialist</p>
                          <p className="text-xs text-muted-foreground">Best available</p>
                        </div>
                      </button>
                      {staffLoading
                        ? Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 rounded-2xl" />
                          ))
                        : staff.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setStaffId(m.id)}
                              className={cn(
                                'flex items-center gap-3 rounded-2xl border bg-background p-3.5 text-left transition-all hover:shadow-sm',
                                staffId === m.id && 'border-primary ring-2 ring-primary/25',
                              )}
                            >
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={m.user.avatarUrl ?? undefined} />
                                <AvatarFallback
                                  className="text-xs font-semibold text-white"
                                  style={{ background: m.color }}
                                >
                                  {initials(m.user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{m.user.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{m.title}</p>
                              </div>
                            </button>
                          ))}
                    </div>
                  </StepShell>
                )}

                {/* ── Time step ─────────────────────────────────── */}
                {step === 'time' && (
                  <StepShell title="Pick a date & time" desc="Select when you'd like to come in">
                    <div className="flex flex-col gap-5">
                      <div className="flex justify-center">
                        <div className="rounded-2xl border bg-background p-2">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => { if (d) { setDate(d); setSlot(null); } }}
                            disabled={{ before: new Date() }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="mb-2.5 flex items-center gap-1.5 text-sm font-medium">
                          <CalendarIcon className="h-4 w-4 text-primary" />
                          {format(date, 'EEEE, MMMM d')}
                        </p>
                        {slotsLoading ? (
                          <div className="grid grid-cols-4 gap-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <Skeleton key={i} className="h-10 rounded-xl" />
                            ))}
                          </div>
                        ) : slotsError ? (
                          <p className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
                            Could not load slots. Please check your connection and try again.
                          </p>
                        ) : slots.length === 0 ? (
                          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No available slots for this day.
                          </p>
                        ) : (
                          <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto">
                            {slots.map((s) => {
                              const active = slot?.start === s.start;
                              const blocked = s.available === false;
                              if (blocked) {
                                return (
                                  <div
                                    key={s.start}
                                    aria-disabled="true"
                                    title="Already booked"
                                    className="select-none rounded-xl border border-dashed bg-muted py-2 text-center text-sm font-medium text-muted-foreground/50 line-through"
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                  >
                                    {format(new Date(s.start), 'HH:mm')}
                                  </div>
                                );
                              }
                              return (
                                <button
                                  key={s.start}
                                  type="button"
                                  onClick={() => setSlot(s)}
                                  className={cn(
                                    'rounded-xl border py-2 text-sm font-medium transition-colors',
                                    active
                                      ? 'border-primary bg-primary text-white'
                                      : 'bg-background hover:border-primary/50',
                                  )}
                                >
                                  {format(new Date(s.start), 'HH:mm')}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </StepShell>
                )}

                {/* ── Details step ──────────────────────────────── */}
                {step === 'details' && (
                  <StepShell title="Your details" desc="We need a few details to confirm your booking">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Full name *</Label>
                        <Input
                          value={details.name}
                          onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))}
                          placeholder="Emma Wilson"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email *</Label>
                        <Input
                          type="email"
                          value={details.email}
                          onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))}
                          placeholder="emma@example.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input
                          type="tel"
                          value={details.phone}
                          onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
                          placeholder="+1 212 555 0100"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>
                          Notes <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Textarea
                          value={details.notes}
                          onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))}
                          placeholder="Any preferences or special requests…"
                          rows={2}
                        />
                      </div>
                    </div>
                  </StepShell>
                )}

                {/* ── Review step ───────────────────────────────── */}
                {step === 'review' && (
                  <StepShell title="Review your booking" desc="Everything look good? Confirm to book.">
                    <div className="space-y-3">
                      <div className="rounded-2xl border bg-background p-4">
                        {selected.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between border-b py-2 last:border-0"
                          >
                            <div>
                              <p className="text-sm font-medium">{s.name}</p>
                              <p className="text-xs text-muted-foreground">{minutesToLabel(s.durationMin)}</p>
                            </div>
                            <span className="text-sm font-semibold">
                              {formatCurrency(Number(s.price), currency, locale)}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-3">
                          <span className="text-sm text-muted-foreground">Total</span>
                          <span className="font-display text-lg font-bold">
                            {formatCurrency(totalPrice, currency, locale)}
                          </span>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {slot && (
                          <div className="flex items-center gap-2.5 rounded-xl border bg-background p-3">
                            <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Date & Time</p>
                              <p className="text-sm font-medium">
                                {format(new Date(slot.start), 'EEE, MMM d · HH:mm')}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2.5 rounded-xl border bg-background p-3">
                          <Users className="h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Specialist</p>
                            <p className="text-sm font-medium">
                              {currentStaff?.user.name ?? 'Any available'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-xl border bg-background p-3">
                          <Clock className="h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="text-sm font-medium">{minutesToLabel(totalDuration)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-xl border bg-background p-3">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Booked for</p>
                            <p className="text-sm font-medium">{details.name || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </StepShell>
                )}

                {/* ── Payment step ──────────────────────────────── */}
                {step === 'payment' && (
                  <StepShell title="Secure deposit" desc="A small deposit to confirm your booking">
                    <PaymentStep
                      amount={depositAmount}
                      currency={currency}
                      locale={locale}
                      submitting={submitting}
                      onPaid={submit}
                    />
                  </StepShell>
                )}
              </div>

              {/* Footer nav */}
              {step !== 'payment' && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <Button variant="ghost" size="sm" onClick={goBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  {step === 'review' ? (
                    <Button onClick={submit} disabled={submitting} className="min-w-32">
                      {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                      Confirm Booking
                    </Button>
                  ) : (
                    <Button onClick={goNext} disabled={!canContinue} className="min-w-24">
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile trust badges */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground lg:hidden">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                Trusted by 5,000+ clients
              </span>
              <span>·</span>
              <span>Free cancellation 24h before</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepShell({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
