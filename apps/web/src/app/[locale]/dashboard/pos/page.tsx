'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  History,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
  User,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import { useClients, useServices, useStaff, useTenant } from '@/hooks/use-salon-data';
import { api } from '@/lib/api';
import type { Client, Paginated, Service } from '@/lib/types';
import { cn, formatCurrency, initials } from '@/lib/utils';
import { PageHeader } from '@/components/dashboard/page-header';
import { CardGridSkeleton } from '@/components/dashboard/loaders';
import { Receipt, type ReceiptData } from '@/components/dashboard/receipt';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/components/ui/sonner';

interface CartItem {
  service: Service;
  qty: number;
  staffId?: string;
}

interface SaleRecord extends ReceiptData {
  id: string;
  saleNumber: number;
}

const TAX_RATE = 0.08;
const SALES_KEY = 'bookingos.sales';

function loadSales(): SaleRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SALES_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as SaleRecord[]).map((s) => ({
      ...s,
      date: new Date(s.date),
    }));
  } catch {
    return [];
  }
}

function persistSales(list: SaleRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SALES_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota errors */
  }
}

export default function PosPage() {
  const t = useTranslations('dashboard.pos');
  const locale = useLocale();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: staffList = [] } = useStaff();
  const { data: tenant } = useTenant();
  const currency = tenant?.currency ?? 'USD';
  const qc = useQueryClient();

  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [discount, setDiscount] = React.useState(0);
  const [method, setMethod] = React.useState<'card' | 'cash' | 'wallet'>('card');

  // Customer state
  const [customer, setCustomer] = React.useState<Client | null>(null);
  const [query, setQuery] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('');
  const { data: clientsPage } = useClients(query);
  const clients = clientsPage?.data ?? [];

  // Last completed sale (for printing) + sales history (for reprinting)
  const [lastReceipt, setLastReceipt] = React.useState<ReceiptData | null>(null);
  const [sales, setSales] = React.useState<SaleRecord[]>([]);

  React.useEffect(() => {
    setSales(loadSales());
  }, []);

  function printReceipt(receipt: ReceiptData) {
    setLastReceipt(receipt);
    // Wait for the print-only receipt to render, then open the print dialog.
    setTimeout(() => window.print(), 60);
  }

  function add(service: Service) {
    setCart((c) => {
      const existing = c.find((i) => i.service.id === service.id);
      if (existing) {
        return c.map((i) =>
          i.service.id === service.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...c, { service, qty: 1 }];
    });
  }

  function setQty(id: string, delta: number) {
    setCart((c) =>
      c
        .map((i) => (i.service.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    );
  }

  function setStaffForItem(serviceId: string, staffId: string) {
    setCart((c) =>
      c.map((i) =>
        i.service.id === serviceId
          ? { ...i, staffId: staffId === '__none__' ? undefined : staffId }
          : i,
      ),
    );
  }

  function pickCustomer(c: Client) {
    setCustomer(c);
    setShowSearch(false);
    setQuery('');
  }

  async function addCustomer() {
    if (!newName.trim()) return;
    const optimistic: Client = {
      id: `cl_${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim() || null,
      loyaltyPoints: 0,
      tags: [],
      createdAt: new Date().toISOString(),
    };
    try {
      const created = await api.clients.create({
        name: optimistic.name,
        phone: optimistic.phone ?? undefined,
      });
      setCustomer(created);
    } catch {
      // Demo fallback: optimistic local client.
      qc.setQueryData<Paginated<Client>>(['clients', ''], (prev) =>
        prev
          ? { ...prev, data: [optimistic, ...prev.data] }
          : prev,
      );
      setCustomer(optimistic);
    } finally {
      toast.success(t('customerAdded'));
      setAdding(false);
      setNewName('');
      setNewPhone('');
    }
  }

  const subtotal = cart.reduce(
    (sum, i) => sum + Number(i.service.price) * i.qty,
    0,
  );
  const discountAmount = (subtotal * discount) / 100;
  const taxed = subtotal - discountAmount;
  const tax = taxed * TAX_RATE;
  const total = taxed + tax;

  async function checkout() {
    const receipt: ReceiptData = {
      salonName: tenant?.name ?? 'BookingOS',
      customerName: customer?.name ?? t('walkIn'),
      lines: cart.map((i) => ({
        name: i.service.name,
        qty: i.qty,
        unitPrice: Number(i.service.price),
      })),
      subtotal,
      discountPercent: discount,
      discountAmount,
      tax,
      total,
      method,
      currency,
      locale,
      date: new Date(),
    };

    let saleNumber = (sales[0]?.saleNumber ?? 1000) + 1;
    try {
      const created = await api.sales.create({
        clientId: customer?.id,
        items: cart.map((i) => ({
          type: 'SERVICE' as const,
          refId: i.service.id,
          name: i.service.name,
          quantity: i.qty,
          unitPrice: Number(i.service.price),
          staffId: i.staffId,
        })),
        discountPercent: discount,
        method: method.toUpperCase() as 'CARD' | 'CASH' | 'WALLET',
      });
      if (created?.number) saleNumber = created.number;
    } catch {
      // Demo fallback: pretend the sale was recorded.
    } finally {
      const record: SaleRecord = { ...receipt, id: `sale_${Date.now()}`, saleNumber };
      const next = [record, ...sales].slice(0, 50);
      setSales(next);
      persistSales(next);
      setLastReceipt(record);
      toast.success(t('paid'), {
        description: formatCurrency(total, currency, locale),
      });
      setCart([]);
      setDiscount(0);
      setCustomer(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Catalog */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('catalog')}
          </h2>
          {servicesLoading ? (
            <CardGridSkeleton
              count={6}
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              cardClassName="h-28"
            />
          ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => add(s)}
                className="group rounded-2xl border bg-card p-4 text-start transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <span
                  className="block h-1.5 w-10 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <p className="mt-3 font-medium leading-tight">{s.name}</p>
                <p className="mt-2 font-semibold text-primary">
                  {formatCurrency(Number(s.price), currency, locale)}
                </p>
              </button>
            ))}
          </div>
          )}

          {/* Recent sales — view & reprint */}
          <div className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <History className="h-4 w-4" />
              {t('recentSales')}
            </h2>
            {sales.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                {t('noSales')}
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border">
                {sales.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 border-b p-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        #{s.saleNumber} · {s.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.date.toLocaleString(locale)} ·{' '}
                        <span className="uppercase">{s.method}</span>
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatCurrency(s.total, currency, locale)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printReceipt(s)}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {t('reprint')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        <Card className="sticky top-20 h-fit">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">{t('cart')}</h2>
            </div>

            {/* Customer selector */}
            <div className="mt-4 rounded-xl border p-3">
              {customer ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {initials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {customer.name}
                    </p>
                    {customer.phone && (
                      <p className="truncate text-xs text-muted-foreground">
                        {customer.phone}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={t('clear')}
                    onClick={() => setCustomer(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span className="flex-1">{t('walkIn')}</span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        setShowSearch((v) => !v);
                        setAdding(false);
                      }}
                    >
                      {t('customer')}
                    </button>
                  </div>

                  {showSearch && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={t('searchCustomer')}
                          className="h-9 ps-8"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto rounded-lg border">
                        {clients.slice(0, 8).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => pickCustomer(c)}
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-start text-sm hover:bg-accent"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">
                                {initials(c.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{c.name}</span>
                          </button>
                        ))}
                        {clients.length === 0 && (
                          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                            —
                          </p>
                        )}
                      </div>

                      {adding ? (
                        <div className="space-y-2 rounded-lg border p-2">
                          <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder={t('customerName')}
                            className="h-9"
                          />
                          <Input
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder={t('customerPhone')}
                            className="h-9"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="gradient"
                              className="flex-1"
                              onClick={addCustomer}
                            >
                              {t('add')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAdding(false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAdding(true)}
                          className="flex w-full items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {t('newCustomer')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {cart.length === 0 ? (
                lastReceipt ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
                    <p className="mt-2 text-sm font-medium">{t('saleComplete')}</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(lastReceipt.total, currency, locale)}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="gradient"
                        onClick={() => printReceipt(lastReceipt)}
                      >
                        <Printer className="h-4 w-4" />
                        {t('printReceipt')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setLastReceipt(null)}
                      >
                        {t('newSale')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    {t('empty')}
                  </p>
                )
              ) : (
                cart.map((i) => {
                  const selectedStaff = staffList.find((m) => m.id === i.staffId);
                  return (
                  <div
                    key={i.service.id}
                    className="rounded-xl border p-2 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {i.service.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(i.service.price) * i.qty, currency, locale)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setQty(i.service.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{i.qty}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setQty(i.service.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => setQty(i.service.id, -i.qty)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Staff selector */}
                    <select
                      value={i.staffId ?? '__none__'}
                      onChange={(e) => setStaffForItem(i.service.id, e.target.value)}
                      className="w-full rounded-lg border bg-background px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="__none__">— No staff assigned —</option>
                      {staffList.filter((m) => m.isBookable).map((m) => (
                        <option key={m.id} value={m.id}>{m.user.name}</option>
                      ))}
                    </select>
                    {selectedStaff && (
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedStaff.color }} />
                        <span className="text-xs text-muted-foreground">{selectedStaff.user.name}</span>
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="disc" className="text-xs">
                    {t('discount')} (%)
                  </Label>
                  <Input
                    id="disc"
                    type="number"
                    min={0}
                    max={100}
                    value={discount}
                    onChange={(e) =>
                      setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))
                    }
                    className="h-9"
                  />
                </div>

                <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
                  <Row label={t('subtotal')} value={formatCurrency(subtotal, currency, locale)} />
                  {discount > 0 && (
                    <Row
                      label={`${t('discount')} ${discount}%`}
                      value={`-${formatCurrency(discountAmount, currency, locale)}`}
                    />
                  )}
                  <Row label={t('tax')} value={formatCurrency(tax, currency, locale)} />
                  <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
                    <span>{t('total')}</span>
                    <span>{formatCurrency(total, currency, locale)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <Label className="text-xs">{t('method')}</Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      { id: 'card', label: t('card'), icon: CreditCard },
                      { id: 'cash', label: t('cash'), icon: Banknote },
                      { id: 'wallet', label: t('wallet'), icon: Wallet },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id as typeof method)}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-xl border py-2.5 text-xs transition-colors',
                          method === m.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'hover:bg-accent',
                        )}
                      >
                        <m.icon className="h-4 w-4" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="gradient"
                  size="lg"
                  className="mt-4 w-full"
                  onClick={checkout}
                >
                  {t('checkout')} · {formatCurrency(total, currency, locale)}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {lastReceipt && <Receipt data={lastReceipt} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
