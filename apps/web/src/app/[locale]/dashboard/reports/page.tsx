'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { format, subDays, subMonths } from 'date-fns';
import { Download, TrendingUp, ShoppingBag, Calendar, Users, Receipt } from 'lucide-react';
import { useTenant, useReportData } from '@/hooks/use-salon-data';
import {
  mockClients,
  mockRevenueByService,
  mockRevenueByStaff,
  mockRevenueSeries,
  mockStatusBreakdown,
} from '@/lib/mock';
import { formatCurrency, initials } from '@/lib/utils';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { BarReport, PieReport } from '@/components/dashboard/report-charts';
import { PlanGate } from '@/components/dashboard/plan-gate';
import { ChartSkeleton } from '@/components/dashboard/loaders';

// ── Period config ──────────────────────────────────────────────────────────────
type Period = '7d' | '30d' | '90d' | '180d' | '365d';

interface PeriodOption {
  label: string;
  days: number;
  bucket: 'day' | 'week' | 'month';
}

const PERIODS: Record<Period, PeriodOption> = {
  '7d':   { label: 'Week',    days: 7,   bucket: 'day' },
  '30d':  { label: 'Month',   days: 30,  bucket: 'day' },
  '90d':  { label: 'Quarter', days: 90,  bucket: 'week' },
  '180d': { label: '6 Months',days: 180, bucket: 'week' },
  '365d': { label: 'Year',    days: 365, bucket: 'month' },
};

// ── Status color map ───────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  COMPLETED:   '#10b981',
  CONFIRMED:   '#3b82f6',
  CHECKED_IN:  '#8b5cf6',
  IN_PROGRESS: '#f97316',
  PENDING:     '#f59e0b',
  CANCELLED:   '#ef4444',
  NO_SHOW:     '#6b7280',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const t = useTranslations('dashboard.reports');
  const locale = useLocale();
  const { data: tenant } = useTenant();
  const currency = tenant?.currency ?? 'USD';

  const [period, setPeriod] = React.useState<Period>('30d');
  const { days, bucket } = PERIODS[period];

  const today = new Date();
  const from = format(subDays(today, days), 'yyyy-MM-dd');
  const to   = format(today, 'yyyy-MM-dd');

  const { data, isLoading, isError } = useReportData(from, to, bucket);

  // ── Data transforms ──────────────────────────────────────────────────────────
  const revenueChartData = React.useMemo(() => {
    if (!data?.revenue?.length) return mockRevenueSeries;
    return data.revenue.map((r) => ({
      date: format(new Date(r.bucket), bucket === 'month' ? 'MMM' : 'MMM d'),
      revenue: Number(r.revenue),
    }));
  }, [data?.revenue, bucket]);

  const byServiceData = React.useMemo(() => {
    if (!data?.byService?.length) return mockRevenueByService;
    return data.byService.map((r) => ({ name: r.name, value: Number(r.revenue) }));
  }, [data?.byService]);

  const byStaffData = React.useMemo(() => {
    if (!data?.byStaff?.length) return mockRevenueByStaff;
    return data.byStaff.map((r) => ({ name: r.name ?? 'Unassigned', value: Number(r.revenue) }));
  }, [data?.byStaff]);

  const statusData = React.useMemo(() => {
    if (!data?.byStatus?.length) return mockStatusBreakdown;
    return data.byStatus.map((r) => ({
      name: r.status.replace('_', ' '),
      value: Number(r.count),
      color: STATUS_COLORS[r.status] ?? '#94a3b8',
    }));
  }, [data?.byStatus]);

  const topClientsData = React.useMemo(() => {
    if (!data?.topClients?.length) {
      return [...mockClients]
        .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))
        .slice(0, 5);
    }
    return data.topClients.slice(0, 5).map((c) => ({
      id: c.clientId,
      name: c.name,
      totalSpent: Number(c.revenue),
      visits: c.visits,
    }));
  }, [data?.topClients]);

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button variant="outline">
            <Download className="h-4 w-4" />
            {t('export')}
          </Button>
        }
      />

      <PlanGate feature="reports">
        {/* Period selector */}
        <div className="flex gap-2 flex-wrap">
          {(Object.entries(PERIODS) as [Period, PeriodOption][]).map(([key, opt]) => (
            <Button
              key={key}
              size="sm"
              variant={period === key ? 'default' : 'outline'}
              onClick={() => setPeriod(key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}><CardContent className="h-24 animate-pulse bg-muted rounded-lg pt-6" /></Card>
              ))}
            </div>
            <ChartSkeleton />
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </div>
        ) : (
          <>
            {/* KPI Summary */}
            {summary && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard
                  label="Revenue"
                  value={formatCurrency(Number(summary.revenue), currency, locale)}
                  icon={TrendingUp}
                />
                <KpiCard
                  label="Sales"
                  value={String(summary.sales)}
                  icon={ShoppingBag}
                />
                <KpiCard
                  label="Appointments"
                  value={String(summary.appointments)}
                  icon={Calendar}
                />
                <KpiCard
                  label="New Clients"
                  value={String(summary.newClients)}
                  icon={Users}
                />
                <KpiCard
                  label="Avg Ticket"
                  value={formatCurrency(Number(summary.averageTicket), currency, locale)}
                  icon={Receipt}
                />
              </div>
            )}

            {/* Revenue over time */}
            <Card>
              <CardHeader>
                <CardTitle>{t('revenueOverTime')}</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart data={revenueChartData} />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Revenue by service */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('byService')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarReport data={byServiceData} horizontal />
                </CardContent>
              </Card>

              {/* Revenue by staff */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('byStaff')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarReport data={byStaffData} />
                </CardContent>
              </Card>

              {/* Status breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('statusBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="w-full sm:w-1/2">
                    <PieReport data={statusData} />
                  </div>
                  <div className="w-full space-y-2 sm:w-1/2">
                    {statusData.map((s) => (
                      <div key={s.name} className="flex items-center gap-2 text-sm">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="flex-1">{s.name}</span>
                        <span className="font-medium">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top clients */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('topClients')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topClientsData.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="w-4 text-sm font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials(c.name)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate font-medium">{c.name}</span>
                      {'visits' in c && (
                        <span className="text-xs text-muted-foreground mr-2">{(c as { visits: number }).visits} visits</span>
                      )}
                      <span className="font-semibold text-primary">
                        {formatCurrency(c.totalSpent ?? 0, currency, locale)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </PlanGate>
    </div>
  );
}
