'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { format, addDays } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import {
  usePublicServices,
  usePublicStaff,
  useAvailability,
} from '@/hooks/use-salon-data';
import { api, DEMO_TENANT_SLUG } from '@/lib/api';
import { mockTenant } from '@/lib/mock';
import type { Service, Slot, StaffMember } from '@/lib/types';
import { cn, formatCurrency, initials, minutesToLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentStep } from './payment-step';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';

type StepId = 'service' | 'staff' | 'time' | 'details' | 'review' | 'payment';

interface BookingFlowProps {
  preSelectedServiceIds?: string[];
  preSelectedStaffId?: string;
  embedded?: boolean;
  onClose?: () => void;
  tenantSlug?: string;
}

export function BookingFlow({
  preSelectedServiceIds,
  preSelectedStaffId,
  embedded = false,
  onClose,
  tenantSlug,
}: BookingFlowProps = {}) {
  const t = useTranslations('booking');
  const locale = useLocale();
  const currency = mockTenant.currency;

  const { data: services = [], isLoading: servicesLoading } = usePublicServices(tenantSlug);
  const { data: staff = [], isLoading: staffLoading } = usePublicStaff(tenantSlug);

  const [step, setStep] = React.useState<StepId>('service');
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>(
    preSelectedServiceIds ?? [],
  );
  const [staffId, setStaffId] = React.useState<string | null>(
    preSelectedStaffId ?? null,
  );
  const [date, setDate] = React.useState<Date>(addDays(new Date(), 1));
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const [details, setDetails] = React.useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const selectedServices = services.filter((s) =>
    selectedServiceIds.includes(s.id),
  );
  const totalPrice = selectedServices.reduce(
    (sum, s) => sum + Number(s.price),
    0,
  );
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.durationMin,
    0,
  );
  const depositAmount = selectedServices.reduce(
    (sum, s) =>
      sum + (s.depositRequired ? Number(s.depositAmount ?? 0) : 0),
    0,
  );
  const requiresPayment = depositAmount > 0;

  const dateStr = format(date, 'yyyy-MM-dd');
  const { data: slots = [], isLoading: slotsLoading } = useAvailability({
    serviceId: selectedServiceIds[0],
    date: dateStr,
    staffId: staffId ?? undefined,
    enabled: step === 'time' && selectedServiceIds.length > 0,
  });

  const allSteps: StepId[] = requiresPayment
    ? ['service', 'staff', 'time', 'details', 'review', 'payment']
    : ['service', 'staff', 'time', 'details', 'review'];
  const stepIndex = allSteps.indexOf(step);

  function goNext() {
    const next = allSteps[stepIndex + 1];
    if (next) setStep(next);
  }
  function goBack() {
    const prev = allSteps[stepIndex - 1];
    if (prev) setStep(prev);
  }

  function toggleService(id: string) {
    setSelectedServiceIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  const canContinue =
    (step === 'service' && selectedServiceIds.length > 0) ||
    step === 'staff' ||
    (step === 'time' && !!slot) ||
    (step === 'details' && details.name && details.email) ||
    step === 'review';

  async function submitBooking() {
    setSubmitting(true);
    try {
      await api.bookings.create({
        notes: details.notes,
        source: 'ONLINE',
        tenantSlug: DEMO_TENANT_SLUG,
        items: selectedServiceIds.map((serviceId) => ({
          serviceId,
          staffId: slot?.staffId ?? staffId ?? undefined,
          startsAt: slot?.start ?? new Date(date).toISOString(),
        })),
      });
    } catch {
      // Demo: succeed anyway so the flow completes.
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  }

  function reset() {
    setSelectedServiceIds([]);
    setStaffId(null);
    setSlot(null);
    setDetails({ name: '', email: '', phone: '', notes: '' });
    setDone(false);
    setStep('service');
  }

  if (done) {
    return (
      <SuccessScreen
        onReset={reset}
        onClose={onClose}
        services={selectedServices}
        slot={slot}
        staff={staff}
        currency={currency}
        locale={locale}
        total={totalPrice}
        embedded={embedded}
      />
    );
  }

  return (
    <div className={embedded ? 'flex min-h-full flex-col' : 'min-h-screen bg-brand-radial'}>
      {!embedded && (
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo showText={false} />
              <div>
                <p className="text-sm font-semibold leading-none">
                  {mockTenant.name}
                </p>
                <p className="text-xs text-muted-foreground">{mockTenant.tagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}

      <main className={embedded ? 'flex-1 p-5' : 'container max-w-3xl py-8 sm:py-12'}>
        {/* Progress */}
        <Stepper steps={allSteps} current={stepIndex} t={t} />

        <div className="mt-8 animate-fade-up">
          {/* SERVICE */}
          {step === 'service' && (
            <Section title={t('pickService')} desc={t('pickServiceDesc')}>
              <div className="grid gap-3 sm:grid-cols-2">
                {servicesLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))
                  : services.map((svc) => {
                      const active = selectedServiceIds.includes(svc.id);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => toggleService(svc.id)}
                          className={cn(
                            'group relative rounded-2xl border bg-card p-4 text-start transition-all hover:shadow-soft',
                            active &&
                              'border-primary ring-2 ring-primary/30 shadow-soft',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{svc.name}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {svc.description}
                              </p>
                            </div>
                            <span
                              className={cn(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                                active
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-border',
                              )}
                            >
                              {active && <Check className="h-3.5 w-3.5" />}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-3 text-sm">
                            <span className="font-semibold text-primary">
                              {formatCurrency(Number(svc.price), currency, locale)}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {minutesToLabel(svc.durationMin)}
                            </span>
                            {svc.depositRequired && (
                              <Badge variant="secondary" className="ms-auto">
                                Deposit
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
              </div>
            </Section>
          )}

          {/* STAFF */}
          {step === 'staff' && (
            <Section title={t('pickStaff')} desc={t('pickStaffDesc')}>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setStaffId(null)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border bg-card p-4 text-start transition-all hover:shadow-soft',
                    staffId === null &&
                      'border-primary ring-2 ring-primary/30',
                  )}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-white">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{t('anyStaff')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('anyStaffDesc')}
                    </p>
                  </div>
                </button>
                {staffLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-2xl border bg-card p-4"
                      >
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))
                  : staff.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setStaffId(m.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border bg-card p-4 text-start transition-all hover:shadow-soft',
                      staffId === m.id && 'border-primary ring-2 ring-primary/30',
                    )}
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={m.user.avatarUrl ?? undefined} />
                      <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground">{m.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* TIME */}
          {step === 'time' && (
            <Section title={t('pickTime')} desc={t('pickTimeDesc')}>
              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                <div className="rounded-2xl border bg-card p-2">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) {
                        setDate(d);
                        setSlot(null);
                      }
                    }}
                    disabled={{ before: new Date() }}
                  />
                </div>
                <div>
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    {format(date, 'EEEE, MMMM d')}
                  </p>
                  {slotsLoading ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-10" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                      {t('noSlots')}
                    </p>
                  ) : (
                    <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pe-1 sm:grid-cols-4">
                      {slots.map((s) => {
                        const active = slot?.start === s.start;
                        return (
                          <button
                            key={s.start + s.staffId}
                            type="button"
                            onClick={() => setSlot(s)}
                            className={cn(
                              'rounded-xl border py-2.5 text-sm font-medium transition-colors',
                              active
                                ? 'border-primary bg-primary text-white'
                                : 'bg-card hover:border-primary/50',
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
            </Section>
          )}

          {/* DETAILS */}
          {step === 'details' && (
            <Section title={t('yourDetails')} desc={t('yourDetailsDesc')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="b-name">{t('name')}</Label>
                  <Input
                    id="b-name"
                    value={details.name}
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-email">{t('email')}</Label>
                  <Input
                    id="b-email"
                    type="email"
                    value={details.email}
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, email: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-phone">{t('phone')}</Label>
                  <Input
                    id="b-phone"
                    type="tel"
                    value={details.phone}
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="b-notes">{t('notes')}</Label>
                  <Textarea
                    id="b-notes"
                    placeholder={t('notesPlaceholder')}
                    value={details.notes}
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, notes: e.target.value }))
                    }
                  />
                </div>
              </div>
            </Section>
          )}

          {/* REVIEW */}
          {step === 'review' && (
            <Section title={t('reviewTitle')} desc={t('reviewDesc')}>
              <Summary
                services={selectedServices}
                slot={slot}
                staff={staff}
                staffId={staffId}
                date={date}
                currency={currency}
                locale={locale}
                total={totalPrice}
                duration={totalDuration}
                details={details}
                t={t}
              />
            </Section>
          )}

          {/* PAYMENT */}
          {step === 'payment' && (
            <Section title={t('paymentTitle')} desc={t('paymentDesc')}>
              <PaymentStep
                amount={depositAmount}
                currency={currency}
                locale={locale}
                submitting={submitting}
                onPaid={submitBooking}
              />
            </Section>
          )}
        </div>

        {/* Footer nav */}
        {step !== 'payment' && (
          <div className="mt-8 flex items-center justify-between gap-3">
            {stepIndex > 0 ? (
              <Button variant="ghost" onClick={goBack}>
                <ArrowLeft className="ltr-flip h-4 w-4" />
                {t('back')}
              </Button>
            ) : embedded && onClose ? (
              <Button variant="ghost" onClick={onClose}>
                <ArrowLeft className="ltr-flip h-4 w-4" />
                {t('back')}
              </Button>
            ) : (
              <Button asChild variant="ghost">
                <Link href="/">
                  <ArrowLeft className="ltr-flip h-4 w-4" />
                  {t('back')}
                </Link>
              </Button>
            )}

            {step === 'review' ? (
              <Button
                variant="gradient"
                size="lg"
                onClick={submitBooking}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('confirm')}
              </Button>
            ) : (
              <Button
                variant="gradient"
                size="lg"
                onClick={goNext}
                disabled={!canContinue}
              >
                {t('next')}
                <ArrowRight className="ltr-flip h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Stepper({
  steps,
  current,
  t,
}: {
  steps: StepId[];
  current: number;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                i < current && 'bg-primary text-white',
                i === current && 'bg-brand-gradient text-white shadow-glow',
                i > current && 'bg-muted text-muted-foreground',
              )}
            >
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden text-sm font-medium md:inline',
                i === current ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {t(`steps.${s}`)}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'h-px flex-1',
                i < current ? 'bg-primary' : 'bg-border',
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Section({
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
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-muted-foreground">{desc}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Summary({
  services,
  slot,
  staff,
  staffId,
  date,
  currency,
  locale,
  total,
  duration,
  details,
  t,
}: {
  services: Service[];
  slot: Slot | null;
  staff: StaffMember[];
  staffId: string | null;
  date: Date;
  currency: string;
  locale: string;
  total: number;
  duration: number;
  details: { name: string; email: string; phone: string };
  t: ReturnType<typeof useTranslations>;
}) {
  const resolvedStaff =
    staff.find((m) => m.id === (slot?.staffId ?? staffId)) ?? null;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5">
        {services.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between border-b py-2 last:border-0"
          >
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {minutesToLabel(s.durationMin)}
              </p>
            </div>
            <span className="font-semibold">
              {formatCurrency(Number(s.price), currency, locale)}
            </span>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">{t('total')}</span>
          <span className="font-display text-xl font-bold">
            {formatCurrency(total, currency, locale)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoRow
          icon={<CalendarIcon className="h-4 w-4" />}
          label={t('steps.time')}
          value={
            slot
              ? `${format(new Date(slot.start), 'EEE, MMM d · HH:mm')}`
              : format(date, 'EEE, MMM d')
          }
        />
        <InfoRow
          icon={<Users className="h-4 w-4" />}
          label={t('steps.staff')}
          value={resolvedStaff ? resolvedStaff.user.name : t('anyStaff')}
        />
        <InfoRow
          icon={<Clock className="h-4 w-4" />}
          label={t('duration')}
          value={minutesToLabel(duration)}
        />
        <InfoRow
          icon={<Check className="h-4 w-4" />}
          label={t('name')}
          value={details.name || '—'}
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function SuccessScreen({
  onReset,
  onClose,
  services,
  slot,
  staff,
  currency,
  locale,
  total,
  embedded,
}: {
  onReset: () => void;
  onClose?: () => void;
  services: Service[];
  slot: Slot | null;
  staff: StaffMember[];
  currency: string;
  locale: string;
  total: number;
  embedded?: boolean;
}) {
  const t = useTranslations('booking');
  return (
    <div className={embedded ? 'flex flex-1 items-center justify-center p-6' : 'flex min-h-screen items-center justify-center bg-brand-radial p-6'}>
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">
          {t('successTitle')}
        </h1>
        <p className="mt-3 text-muted-foreground">{t('successDesc')}</p>

        <div className="mt-8 rounded-2xl border bg-card p-5 text-start">
          {services.map((s) => (
            <div key={s.id} className="flex justify-between py-1 text-sm">
              <span>{s.name}</span>
              <span className="font-medium">
                {formatCurrency(Number(s.price), currency, locale)}
              </span>
            </div>
          ))}
          {slot && (
            <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
              {format(new Date(slot.start), 'EEEE, MMMM d · HH:mm')}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={onReset}>
            {t('bookAnother')}
          </Button>
          {embedded && onClose ? (
            <Button variant="gradient" onClick={onClose}>
              Done
            </Button>
          ) : (
            <Button asChild variant="gradient">
              <Link href="/">SalonOS</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
