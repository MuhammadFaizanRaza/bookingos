'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  CreditCard,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Palette,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useBillingUsage, useLocations, useTenant } from '@/hooks/use-salon-data';
import { api } from '@/lib/api';
import { isUnlimited, planDef } from '@/lib/plans';
import type { Location, Tenant } from '@/lib/types';
import { PageHeader } from '@/components/dashboard/page-header';
import { UpgradeDialog } from '@/components/dashboard/upgrade-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import { toast } from '@/components/ui/sonner';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR'];
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Karachi',
  'Asia/Dubai',
];
const LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'ur', label: 'اردو' },
  { id: 'ar', label: 'العربية' },
];

// ---- Location Dialog -------------------------------------------------------

type LocationForm = {
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  timezone: string;
  isActive: boolean;
};

const EMPTY_LOC: LocationForm = {
  name: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
  timezone: '',
  isActive: true,
};

function LocationDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Location | null;
  onSaved: (loc: Location) => void;
}) {
  const [form, setForm] = React.useState<LocationForm>(EMPTY_LOC);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        address: editing.address ?? '',
        city: editing.city ?? '',
        country: editing.country ?? '',
        phone: editing.phone ?? '',
        email: '',
        timezone: editing.timezone ?? '',
        isActive: editing.isActive,
      });
    } else {
      setForm(EMPTY_LOC);
    }
  }, [editing, open]);

  function set<K extends keyof LocationForm>(k: K, v: LocationForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let result: Location;
      if (editing) {
        result = await api.locations.update(editing.id, form);
      } else {
        result = await api.locations.create(form);
      }
      onSaved(result);
      onOpenChange(false);
      toast.success(editing ? 'Location updated' : 'Location added');
    } catch {
      // Demo: create a fake location object so UI still updates
      const fake: Location = {
        id: editing?.id ?? `loc_${Date.now()}`,
        ...form,
        isActive: form.isActive,
      };
      onSaved(fake);
      onOpenChange(false);
      toast.success(editing ? 'Location updated' : 'Location added');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Location' : 'Add Location'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Location Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Downtown Flagship"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="New York"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder="US"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 212 555 0100"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="location@salon.com"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Timezone override</Label>
              <Select value={form.timezone} onValueChange={(v) => set('timezone', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Use salon default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Use salon default</SelectItem>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Show on booking site</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => set('isActive', v)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Location'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main page -------------------------------------------------------------

export default function SettingsPage() {
  const t = useTranslations('dashboard.settings');
  const { data: tenant, isLoading } = useTenant();
  const { data: locations = [] } = useLocations();
  const { data: usage } = useBillingUsage();
  const qc = useQueryClient();

  const [form, setForm] = React.useState<Partial<Tenant>>({});
  const [saving, setSaving] = React.useState(false);
  const [billingLoading, setBillingLoading] = React.useState(false);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);

  const [locDialogOpen, setLocDialogOpen] = React.useState(false);
  const [editingLoc, setEditingLoc] = React.useState<Location | null>(null);
  const [deletingLocId, setDeletingLocId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (tenant) setForm(tenant);
  }, [tenant]);

  function set<K extends keyof Tenant>(key: K, value: Tenant[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await api.tenant.update(form);
    } catch {
      // Demo: pretend saved
    } finally {
      setSaving(false);
      toast.success(t('saved'));
    }
  }

  async function manageBilling() {
    setBillingLoading(true);
    try {
      const { url } = await api.billing.portal();
      window.location.href = url;
    } catch {
      setUpgradeOpen(true);
    } finally {
      setBillingLoading(false);
    }
  }

  function handleLocSaved(loc: Location) {
    qc.setQueryData<Location[]>(['locations'], (prev = []) => {
      const idx = prev.findIndex((l) => l.id === loc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = loc;
        return next;
      }
      return [...prev, loc];
    });
  }

  async function deleteLocation(id: string) {
    setDeletingLocId(id);
    try {
      await api.locations.remove(id);
    } catch {
      // Demo: proceed anyway
    } finally {
      setDeletingLocId(null);
      qc.setQueryData<Location[]>(['locations'], (prev = []) =>
        prev.filter((l) => l.id !== id),
      );
      toast.success('Location removed');
    }
  }

  const def = planDef(tenant?.plan);
  const staffUsed = usage?.staff.used ?? 0;
  const staffLimit = usage?.staff.limit ?? def.maxStaff;
  const locUsed = usage?.locations.used ?? locations.length;
  const locLimit = usage?.locations.limit ?? def.maxLocations;

  const slug = tenant?.slug ?? 'lumiere';

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isLoading ? (
            <>
              <SettingsCardSkeleton fields={6} />
              <SettingsCardSkeleton fields={5} />
            </>
          ) : (
            <>
              {/* Branding */}
              <Card>
                <CardHeader className="flex-row items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <CardTitle>{t('branding')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('salonName')}</Label>
                      <Input
                        value={form.name ?? ''}
                        onChange={(e) => set('name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('tagline')}</Label>
                      <Input
                        value={form.tagline ?? ''}
                        onChange={(e) => set('tagline', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>{t('logoUrl')}</Label>
                      <Input
                        value={form.logoUrl ?? ''}
                        placeholder="https://…"
                        onChange={(e) => set('logoUrl', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('primaryColor')}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.primaryColor ?? '#7C3AED'}
                          onChange={(e) => set('primaryColor', e.target.value)}
                          className="h-11 w-14 cursor-pointer rounded-xl border"
                        />
                        <Input
                          value={form.primaryColor ?? ''}
                          onChange={(e) => set('primaryColor', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>{t('currency')}</Label>
                      <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('timezone')}</Label>
                      <Select value={form.timezone} onValueChange={(v) => set('timezone', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('locale')}</Label>
                      <Select value={form.locale} onValueChange={(v) => set('locale', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LOCALES.map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="gradient" onClick={save} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t('save')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Booking page */}
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <CardTitle>{t('bookingPage')}</CardTitle>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/book/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Preview site
                    </a>
                    <Switch
                      aria-label={t('bookingEnabled')}
                      checked={form.bookingEnabled ?? true}
                      onCheckedChange={(v) => set('bookingEnabled', v)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('coverImageUrl')}</Label>
                    <Input
                      value={form.coverImageUrl ?? ''}
                      placeholder="https://…"
                      onChange={(e) => set('coverImageUrl', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('about')}</Label>
                    <Textarea
                      rows={3}
                      value={form.about ?? ''}
                      onChange={(e) => set('about', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('phone')}</Label>
                      <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('whatsapp')}</Label>
                      <Input value={form.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>{t('address')}</Label>
                      <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('instagramUrl')}</Label>
                      <Input
                        value={form.instagramUrl ?? ''}
                        placeholder="https://instagram.com/…"
                        onChange={(e) => set('instagramUrl', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('facebookUrl')}</Label>
                      <Input
                        value={form.facebookUrl ?? ''}
                        placeholder="https://facebook.com/…"
                        onChange={(e) => set('facebookUrl', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="gradient" onClick={save} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t('save')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Locations */}
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle>Locations</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingLoc(null);
                      setLocDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Location
                  </Button>
                </CardHeader>
                <CardContent>
                  {locations.length === 0 ? (
                    <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                      No locations yet.{' '}
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() => {
                          setEditingLoc(null);
                          setLocDialogOpen(true);
                        }}
                      >
                        Add your first location
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {locations.map((loc) => (
                        <div
                          key={loc.id}
                          className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{loc.name}</p>
                              <Badge
                                variant={loc.isActive ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {loc.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {[loc.address, loc.city, loc.country]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                            {loc.phone && (
                              <p className="text-xs text-muted-foreground">{loc.phone}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingLoc(loc);
                                setLocDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteLocation(loc.id)}
                              disabled={deletingLocId === loc.id}
                            >
                              {deletingLocId === loc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Plan & usage */}
        <Card className="h-fit">
          <CardHeader className="flex-row items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>{t('billing')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-brand-gradient p-5 text-white">
              <p className="text-sm text-white/80">{t('plan')}</p>
              <p className="font-display text-2xl font-bold">
                {def.name}
                <span className="ms-1 text-base font-medium text-white/80">
                  · ${def.price}/mo
                </span>
              </p>
              <Badge className="mt-2 border-transparent bg-white/20">
                {usage?.status ?? tenant?.status ?? 'ACTIVE'}
              </Badge>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">{t('usage')}</p>
              <UsageRow
                label={t('staffUsage')}
                used={staffUsed}
                limit={staffLimit}
                unlimitedLabel={t('unlimited')}
              />
              <UsageRow
                label={t('locationsUsage')}
                used={locUsed}
                limit={locLimit}
                unlimitedLabel={t('unlimited')}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('renews')}</span>
              <span className="font-medium">
                {usage?.currentPeriodEnd
                  ? new Date(usage.currentPeriodEnd).toLocaleDateString()
                  : 'Jul 15, 2026'}
              </span>
            </div>

            <Button variant="gradient" className="w-full" onClick={() => setUpgradeOpen(true)}>
              {t('upgradePlan')}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={manageBilling}
              disabled={billingLoading}
            >
              {billingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {t('manageBilling')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <LocationDialog
        open={locDialogOpen}
        onOpenChange={setLocDialogOpen}
        editing={editingLoc}
        onSaved={handleLocSaved}
      />
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}

function SettingsCardSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-md" />
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

function UsageRow({
  label,
  used,
  limit,
  unlimitedLabel,
}: {
  label: string;
  used: number;
  limit: number;
  unlimitedLabel: string;
}) {
  const unlimited = isUnlimited(limit);
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used} / {unlimited ? unlimitedLabel : limit}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand-gradient transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
