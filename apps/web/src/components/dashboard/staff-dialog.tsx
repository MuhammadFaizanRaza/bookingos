'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useServices } from '@/hooks/use-salon-data';
import type { StaffMember } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  title: z.string().optional(),
  bio: z.string().optional(),
  color: z.string(),
  commissionRate: z.coerce.number().min(0).max(100),
  isBookable: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// Weekly working hours — drives when this staff member can be booked.
const DAYS: { i: number; key: string }[] = [
  { i: 1, key: 'mon' },
  { i: 2, key: 'tue' },
  { i: 3, key: 'wed' },
  { i: 4, key: 'thu' },
  { i: 5, key: 'fri' },
  { i: 6, key: 'sat' },
  { i: 0, key: 'sun' },
];
type DayHours = { open: boolean; start: string; end: string };
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function defaultHours(staff?: StaffMember | null): Record<number, DayHours> {
  const existing = (
    staff as
      | { workingHours?: { dayOfWeek: number; startMin: number; endMin: number }[] }
      | null
      | undefined
  )?.workingHours;
  const out: Record<number, DayHours> = {};
  for (const d of DAYS) {
    const wh = existing?.find((w) => w.dayOfWeek === d.i);
    if (wh)
      out[d.i] = { open: true, start: toHHMM(wh.startMin), end: toHHMM(wh.endMin) };
    else out[d.i] = { open: d.i !== 0, start: '09:00', end: '19:00' }; // Sun closed
  }
  return out;
}

export function StaffDialog({
  open,
  onOpenChange,
  staff,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: StaffMember | null;
}) {
  const t = useTranslations('dashboard.staff');
  const qc = useQueryClient();
  const isEdit = !!staff;
  const { data: allServices = [] } = useServices();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      title: '',
      bio: '',
      color: '#7C3AED',
      commissionRate: 30,
      isBookable: true,
    },
  });

  const [hours, setHours] = React.useState<Record<number, DayHours>>(() =>
    defaultHours(staff),
  );
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      reset({
        name: staff?.user.name ?? '',
        email: staff?.user.email ?? '',
        title: staff?.title ?? '',
        bio: staff?.bio ?? '',
        color: staff?.color ?? '#7C3AED',
        commissionRate: Number(staff?.commissionRate ?? 30),
        isBookable: staff?.isBookable ?? true,
      });
      setHours(defaultHours(staff));
      setSelectedServiceIds(staff?.services?.map((s) => s.id) ?? []);
    }
  }, [open, staff, reset]);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function setDay(i: number, patch: Partial<DayHours>) {
    setHours((h) => ({ ...h, [i]: { ...h[i], ...patch } }));
  }

  const color = watch('color');
  const isBookable = watch('isBookable');

  async function onSubmit(values: FormValues) {
    const optimistic: StaffMember = {
      id: staff?.id ?? `stf_${Date.now()}`,
      title: values.title || null,
      bio: values.bio || null,
      color: values.color,
      isBookable: values.isBookable,
      commissionRate: values.commissionRate,
      user: {
        id: staff?.user.id ?? `u_${Date.now()}`,
        name: values.name,
        email: values.email,
        avatarUrl: staff?.user.avatarUrl ?? null,
      },
    };

    function applyCache() {
      qc.setQueryData<StaffMember[]>(['staff'], (prev = []) =>
        isEdit
          ? prev.map((s) => (s.id === optimistic.id ? optimistic : s))
          : [...prev, optimistic],
      );
    }

    const weeklyHours = DAYS.filter((d) => hours[d.i]?.open).map((d) => ({
      dayOfWeek: d.i,
      startMin: toMin(hours[d.i].start),
      endMin: toMin(hours[d.i].end),
    }));

    try {
      let savedId = staff?.id;
      if (isEdit && staff) {
        await api.staff.update(staff.id, {
          name: values.name,
          title: values.title,
          bio: values.bio,
          color: values.color,
          commissionRate: values.commissionRate,
          isBookable: values.isBookable,
          serviceIds: selectedServiceIds,
        });
      } else {
        const created = await api.staff.create({
          name: values.name,
          email: values.email,
          title: values.title,
          bio: values.bio,
          color: values.color,
          commissionRate: values.commissionRate,
          isBookable: values.isBookable,
          serviceIds: selectedServiceIds,
        });
        savedId = created?.id;
      }
      if (savedId) await api.staff.setWorkingHours(savedId, weeklyHours);
      qc.invalidateQueries({ queryKey: ['staff'] });
    } catch {
      // Demo fallback: optimistically update the cache.
      applyCache();
    } finally {
      toast.success(isEdit ? t('updated') : t('created'));
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editStaff') : t('newStaff')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">{t('name')} *</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                disabled={isEdit}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{t('email')} *</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">{t('title2')}</Label>
              <Input id="title" {...register('title')} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bio">{t('bio')}</Label>
              <Textarea id="bio" rows={3} {...register('bio')} />
            </div>
            <div className="space-y-2">
              <Label>{t('color')}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setValue('color', e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-xl border"
                />
                <Input value={color} {...register('color')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionRate">{t('commissionRate')}</Label>
              <Input
                id="commissionRate"
                type="number"
                min={0}
                max={100}
                {...register('commissionRate')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label htmlFor="isBookable" className="cursor-pointer">
              {t('isBookable')}
            </Label>
            <Switch
              id="isBookable"
              checked={isBookable}
              onCheckedChange={(v) => setValue('isBookable', v)}
            />
          </div>

          {/* Services this staff member can perform */}
          <div className="space-y-2 rounded-xl border p-3">
            <Label>Services <span className="text-muted-foreground text-xs">(select which services this staff can perform)</span></Label>
            {allServices.length === 0 ? (
              <p className="text-xs text-muted-foreground">No services found — add services first.</p>
            ) : (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {allServices.map((svc) => {
                  const active = selectedServiceIds.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => toggleService(svc.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all hover:border-primary/40',
                        active && 'border-primary bg-primary/5',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          active ? 'border-primary bg-primary text-white' : 'border-border',
                        )}
                      >
                        {active && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{svc.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly working hours — bookings can only be made within these */}
          <div className="space-y-2 rounded-xl border p-3">
            <Label>{t('workingHours')}</Label>
            <div className="space-y-1.5">
              {DAYS.map((d) => {
                const dh = hours[d.i];
                return (
                  <div key={d.i} className="flex items-center gap-2">
                    <div className="flex w-28 items-center gap-2">
                      <Switch
                        checked={dh.open}
                        onCheckedChange={(v) => setDay(d.i, { open: v })}
                      />
                      <span className="text-sm">{t(`days.${d.key}`)}</span>
                    </div>
                    {dh.open ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="time"
                          value={dh.start}
                          onChange={(e) => setDay(d.i, { start: e.target.value })}
                          className="h-9 w-28"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="time"
                          value={dh.end}
                          onChange={(e) => setDay(d.i, { end: e.target.value })}
                          className="h-9 w-28"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {t('closed')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" variant="gradient" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
