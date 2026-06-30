import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** A page header placeholder (title + subtitle, optional action). */
export function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {action && <Skeleton className="h-10 w-32" />}
    </div>
  );
}

/** A single KPI card placeholder, mirroring KpiCard's layout. */
export function KpiCardSkeleton() {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-8 w-24" />
      <Skeleton className="mt-2 h-4 w-20" />
    </Card>
  );
}

/** A row of KPI card skeletons. */
export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** A chart placeholder inside a titled card. */
export function ChartSkeleton({
  className,
  height = 'h-64',
}: {
  className?: string;
  height?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn('w-full', height)} />
      </CardContent>
    </Card>
  );
}

/** A vertical list of avatar + two-line rows inside a titled card. */
export function ListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="hidden h-8 w-16 sm:block" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** A table placeholder wrapped in a Card, mirroring a data table. */
export function TableSkeleton({
  rows = 6,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
              <TableCell colSpan={columns}>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-8 flex-1" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/** A grid of generic card placeholders. */
export function CardGridSkeleton({
  count = 6,
  className = 'grid gap-3 md:grid-cols-2 xl:grid-cols-3',
  cardClassName = 'h-28',
}: {
  count?: number;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('rounded-2xl', cardClassName)} />
      ))}
    </div>
  );
}

/** A grouped service-menu placeholder (label + card grid). */
export function ServiceGroupsSkeleton({ groups = 2 }: { groups?: number }) {
  return (
    <div className="space-y-8">
      {Array.from({ length: groups }).map((_, g) => (
        <div key={g}>
          <Skeleton className="mb-3 h-4 w-28" />
          <CardGridSkeleton count={3} cardClassName="h-28" />
        </div>
      ))}
    </div>
  );
}

/** A grid of staff cards: cover band, avatar, name + meta lines. */
export function StaffGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-20 rounded-none" />
          <CardContent className="-mt-10 flex flex-col items-center text-center">
            <Skeleton className="h-20 w-20 rounded-full border-4 border-card" />
            <Skeleton className="mt-3 h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-4 h-6 w-32 rounded-full" />
            <Skeleton className="mt-4 h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** A day-grid calendar placeholder (gutter + staff columns). */
export function CalendarSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <div className="flex min-w-[720px]">
          <div className="w-16 shrink-0 border-e">
            <div className="h-12 border-b" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border-b" style={{ height: 64 }} />
            ))}
          </div>
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="flex-1 border-e last:border-e-0">
              <div className="flex h-12 items-center gap-2 border-b px-3">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="relative" style={{ height: 8 * 64 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="border-b" style={{ height: 64 }} />
                ))}
                <Skeleton
                  className="absolute inset-x-1 rounded-lg"
                  style={{ top: (c % 2 ? 1 : 2) * 64, height: 80 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
