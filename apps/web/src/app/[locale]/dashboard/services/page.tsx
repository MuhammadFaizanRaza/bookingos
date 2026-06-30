'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useServiceCategories, useServices, useTenant } from '@/hooks/use-salon-data';
import { api } from '@/lib/api';
import type { BookingMode, Service, ServiceCategory } from '@/lib/types';
import { formatCurrency, minutesToLabel } from '@/lib/utils';
import { PageHeader } from '@/components/dashboard/page-header';
import { ServiceGroupsSkeleton } from '@/components/dashboard/loaders';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from '@/components/ui/sonner';

export default function ServicesPage() {
  const t = useTranslations('dashboard.services');
  const locale = useLocale();
  const { data: services = [], isLoading } = useServices();
  const { data: tenant } = useTenant();
  const currency = tenant?.currency ?? 'USD';

  const [editing, setEditing] = React.useState<Service | null>(null);
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Service | null>(null);
  const qc = useQueryClient();

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(s: Service) {
    setEditing(s);
    setOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    try {
      await api.services.remove(id);
      qc.invalidateQueries({ queryKey: ['services'] });
    } catch {
      qc.setQueryData<Service[]>(['services'], (prev = []) =>
        prev.filter((s) => s.id !== id),
      );
    } finally {
      toast.success(t('deleted'));
      setDeleting(null);
    }
  }

  // Group by category for a tidy menu.
  const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
    const key = s.category?.name ?? 'Other';
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button variant="gradient" onClick={openNew}>
            <Plus className="h-4 w-4" />
            {t('newService')}
          </Button>
        }
      />

      {isLoading ? (
        <ServiceGroupsSkeleton />
      ) : (
      <div className="space-y-8">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((s) => (
                <Card key={s.id} className="group">
                  <CardContent className="flex items-start gap-3 p-4">
                    <span
                      className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{s.name}</p>
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleting(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {s.description}
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-sm">
                        <span className="font-semibold text-primary">
                          {formatCurrency(Number(s.price), currency, locale)}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {minutesToLabel(s.durationMin)}
                        </span>
                        {s.onlineBookable && (
                          <Badge variant="success" className="ms-auto">
                            {t('online')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}

      <ServiceDialog
        open={open}
        onOpenChange={setOpen}
        service={editing}
        onSaved={() => setOpen(false)}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={t('delete')}
        description={t('deleteConfirm')}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ServiceDialog({
  open,
  onOpenChange,
  service,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  service: Service | null;
  onSaved: () => void;
}) {
  const t = useTranslations('dashboard.services');
  const qc = useQueryClient();
  const isEdit = !!service;
  const { data: categories = [] } = useServiceCategories();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [bookingMode, setBookingMode] = React.useState<BookingMode>('TIME_SLOT');
  const [durationMin, setDurationMin] = React.useState(30);
  const [price, setPrice] = React.useState(0);
  const [capacity, setCapacity] = React.useState(10);
  const [inventory, setInventory] = React.useState(1);
  const [color, setColor] = React.useState('#7C3AED');
  const [onlineBookable, setOnlineBookable] = React.useState(true);
  const [categoryId, setCategoryId] = React.useState<string>('');
  const [addingCat, setAddingCat] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(service?.name ?? '');
      setDescription(service?.description ?? '');
      setBookingMode(service?.bookingMode ?? 'TIME_SLOT');
      setDurationMin(service?.durationMin ?? 30);
      setPrice(service ? Number(service.price) : 0);
      setCapacity(service?.capacity ?? 10);
      setInventory(service?.inventory ?? 1);
      setColor(service?.color ?? '#7C3AED');
      setOnlineBookable(service?.onlineBookable ?? true);
      setCategoryId(service?.categoryId ?? service?.category?.id ?? '');
      setAddingCat(false);
      setNewCatName('');
    }
  }, [open, service]);

  async function addCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const optimistic: ServiceCategory = { id: `cat_${Date.now()}`, name: trimmed };
    try {
      const created = await api.serviceCategories.create({ name: trimmed });
      qc.setQueryData<ServiceCategory[]>(['service-categories'], (prev = []) => [
        ...prev,
        created,
      ]);
      setCategoryId(created.id);
    } catch {
      qc.setQueryData<ServiceCategory[]>(['service-categories'], (prev = []) => [
        ...prev,
        optimistic,
      ]);
      setCategoryId(optimistic.id);
    } finally {
      setAddingCat(false);
      setNewCatName('');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      description,
      bookingMode,
      durationMin,
      price,
      capacity: bookingMode === 'CAPACITY' ? capacity : undefined,
      inventory: bookingMode === 'DATE_RANGE' ? inventory : undefined,
      color,
      onlineBookable,
      categoryId: categoryId || undefined,
    };
    const cat = categories.find((c) => c.id === categoryId) ?? null;
    const optimistic: Service = {
      id: service?.id ?? `svc_${Date.now()}`,
      name: payload.name,
      description: payload.description || null,
      bookingMode: payload.bookingMode,
      durationMin: payload.durationMin,
      price: payload.price,
      capacity: payload.capacity ?? null,
      inventory: payload.inventory ?? null,
      color: payload.color,
      categoryId: categoryId || null,
      category: cat,
      imageUrl: service?.imageUrl ?? null,
      onlineBookable: payload.onlineBookable,
      depositRequired: service?.depositRequired ?? false,
      depositAmount: service?.depositAmount ?? null,
      isActive: service?.isActive ?? true,
    };

    function applyCache() {
      qc.setQueryData<Service[]>(['services'], (prev = []) =>
        isEdit
          ? prev.map((s) => (s.id === optimistic.id ? optimistic : s))
          : [...prev, optimistic],
      );
    }

    try {
      if (isEdit && service) {
        await api.services.update(service.id, payload);
      } else {
        await api.services.create(payload);
      }
      qc.invalidateQueries({ queryKey: ['services'] });
    } catch {
      // Demo fallback: optimistically update the cache.
      applyCache();
    } finally {
      setSaving(false);
      toast.success(isEdit ? t('updated') : t('created'));
      onSaved();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {service ? t('editService') : t('newService')}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="s-name">{t('name')}</Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-desc">{t('description')}</Label>
            <Textarea
              id="s-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('category')}</Label>
            {addingCat ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={newCatName}
                  placeholder={t('categoryName')}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                />
                <Button type="button" variant="gradient" onClick={addCategory}>
                  {t('add')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddingCat(false)}
                >
                  {t('cancel')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('noCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddingCat(true)}
                >
                  {t('newCategory')}
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-mode">Booking type</Label>
            <Select
              value={bookingMode}
              onValueChange={(v) => setBookingMode(v as BookingMode)}
            >
              <SelectTrigger id="s-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TIME_SLOT">
                  Appointment — time slot (staff + duration)
                </SelectItem>
                <SelectItem value="DATE_RANGE">
                  Date range — per night/day (rooms, rentals)
                </SelectItem>
                <SelectItem value="CAPACITY">
                  Capacity — seats per session (classes, events, tables)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {bookingMode !== 'DATE_RANGE' && (
              <div className="space-y-2">
                <Label htmlFor="s-duration">
                  {bookingMode === 'CAPACITY'
                    ? 'Session length (min)'
                    : `${t('duration')} (min)`}
                </Label>
                <Input
                  id="s-duration"
                  type="number"
                  min={5}
                  step={5}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="s-price">
                {bookingMode === 'DATE_RANGE'
                  ? `${t('price')} / night`
                  : bookingMode === 'CAPACITY'
                    ? `${t('price')} / seat`
                    : t('price')}
              </Label>
              <Input
                id="s-price"
                type="number"
                step="0.01"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
            {bookingMode === 'CAPACITY' && (
              <div className="space-y-2">
                <Label htmlFor="s-capacity">Seats per session</Label>
                <Input
                  id="s-capacity"
                  type="number"
                  min={1}
                  step={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </div>
            )}
            {bookingMode === 'DATE_RANGE' && (
              <div className="space-y-2">
                <Label htmlFor="s-inventory">Units available</Label>
                <Input
                  id="s-inventory"
                  type="number"
                  min={1}
                  step={1}
                  value={inventory}
                  onChange={(e) => setInventory(Number(e.target.value))}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('color')}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-xl border"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
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
            <Button type="submit" variant="gradient" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
