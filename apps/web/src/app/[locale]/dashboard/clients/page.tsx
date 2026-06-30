'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useClients, useTenant } from '@/hooks/use-salon-data';
import { api } from '@/lib/api';
import type { Client, Paginated } from '@/lib/types';
import { formatCurrency, initials } from '@/lib/utils';
import { PageHeader } from '@/components/dashboard/page-header';
import { ConfirmDialog } from '@/components/dashboard/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ClientsPage() {
  const t = useTranslations('dashboard.clients');
  const locale = useLocale();
  const qc = useQueryClient();
  const [q, setQ] = React.useState('');
  const { data, isLoading } = useClients(q);
  const { data: tenant } = useTenant();
  const currency = tenant?.currency ?? 'USD';
  const clients = data?.data ?? [];
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Client | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    try {
      await api.clients.remove(id);
      qc.invalidateQueries({ queryKey: ['clients'] });
    } catch {
      qc.setQueryData<Paginated<Client>>(['clients', q], (prev) =>
        prev
          ? { ...prev, data: prev.data.filter((c) => c.id !== id) }
          : prev,
      );
    } finally {
      toast.success(t('deleted'));
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button variant="gradient" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('newClient')}
          </Button>
        }
      />

      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} q={q} />

      <div className="relative max-w-md">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('name')}
          className="ps-9"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('contact')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('visits')}</TableHead>
              <TableHead>{t('spent')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('lastVisit')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('loyalty')}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : clients.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{initials(c.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <div className="flex gap-1">
                            {c.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px]"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm">{c.email}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {c._count?.appointments ?? 0}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(c.totalSpent ?? 0, currency, locale)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {c.lastVisit
                        ? format(new Date(c.lastVisit), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="font-medium text-primary">
                        {c.loyaltyPoints}
                      </span>{' '}
                      <span className="text-xs text-muted-foreground">pts</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleting(c)}
                        aria-label={t('delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </Card>

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

function ClientDialog({
  open,
  onOpenChange,
  q,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  q: string;
}) {
  const t = useTranslations('dashboard.clients');
  const qc = useQueryClient();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setPhone('');
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const optimistic: Client = {
      id: `cl_${Date.now()}`,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      loyaltyPoints: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      _count: { appointments: 0 },
      totalSpent: 0,
      lastVisit: null,
    };

    function prepend(key: unknown[]) {
      qc.setQueryData<Paginated<Client>>(key, (prev) =>
        prev
          ? { ...prev, data: [optimistic, ...prev.data], meta: { ...prev.meta, total: prev.meta.total + 1 } }
          : prev,
      );
    }

    try {
      await api.clients.create({
        name: optimistic.name,
        email: optimistic.email ?? undefined,
        phone: optimistic.phone ?? undefined,
      });
      qc.invalidateQueries({ queryKey: ['clients'] });
    } catch {
      // Demo fallback: optimistically add to the current + base lists.
      prepend(['clients', q]);
      if (q) prepend(['clients', '']);
    } finally {
      setSaving(false);
      toast.success(t('created'));
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('newClient')}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="c-name">{t('name')}</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-email">{t('email')}</Label>
              <Input
                id="c-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">{t('phone')}</Label>
              <Input
                id="c-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
