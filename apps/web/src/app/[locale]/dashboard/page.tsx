'use client';

import { useLocale, useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  CalendarDays,
  DollarSign,
  Gauge,
  UserPlus,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useAppointments, useTenant } from '@/hooks/use-salon-data';
import {
  mockActivity,
  mockKpis,
  mockRevenueSeries,
  statusColors,
} from '@/lib/mock';
import { cn, formatCurrency, initials } from '@/lib/utils';
import { PageHeader } from '@/components/dashboard/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function OverviewPage() {
  const t = useTranslations('dashboard.overview');
  const locale = useLocale();
  const { data: tenant } = useTenant();
  const { data: appointments = [], isLoading } = useAppointments();
  const currency = tenant?.currency ?? 'USD';

  const upcoming = [...appointments]
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t('revenue')}
          value={formatCurrency(mockKpis.revenueToday, currency, locale)}
          delta={mockKpis.revenueTodayDelta}
          icon={<DollarSign className="h-5 w-5" />}
          tint="text-emerald-500"
        />
        <KpiCard
          label={t('appointments')}
          value={String(mockKpis.appointmentsToday)}
          delta={mockKpis.appointmentsDelta}
          deltaSuffix=""
          icon={<CalendarDays className="h-5 w-5" />}
          tint="text-violet-500"
        />
        <KpiCard
          label={t('newClients')}
          value={String(mockKpis.newClients)}
          delta={mockKpis.newClientsDelta}
          deltaSuffix=""
          icon={<UserPlus className="h-5 w-5" />}
          tint="text-fuchsia-500"
        />
        <KpiCard
          label={t('occupancy')}
          value={`${mockKpis.occupancy}%`}
          delta={mockKpis.occupancyDelta}
          icon={<Gauge className="h-5 w-5" />}
          tint="text-sky-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('revenueChart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={mockRevenueSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('activity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockActivity.map((a) => (
              <div key={a.id} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm leading-snug">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('upcoming')}</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/calendar">{t('viewAll')}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="hidden h-8 w-16 sm:block" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('noUpcoming')}
            </p>
          ) : (
            <div className="divide-y">
              {upcoming.map((apt) => {
                const item = apt.items[0];
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {initials(apt.client?.name ?? 'Guest')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {apt.client?.name ?? 'Walk-in'}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {item?.service?.name} · {item?.staff?.user.name}
                      </p>
                    </div>
                    <div className="hidden text-end text-sm sm:block">
                      <p className="font-medium">
                        {format(new Date(apt.startsAt), 'HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(apt.startsAt), 'EEE, MMM d')}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        'shrink-0 border-transparent',
                        statusColors[apt.status],
                      )}
                    >
                      {apt.status.replace('_', ' ')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
