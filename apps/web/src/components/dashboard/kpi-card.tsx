import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  value,
  delta,
  deltaSuffix = '%',
  icon,
  tint = 'text-primary',
}: {
  label: string;
  value: string;
  delta?: number;
  deltaSuffix?: string;
  icon: React.ReactNode;
  tint?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10', tint)}>
          {icon}
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
              up
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
            )}
          >
            {up ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta)}
            {deltaSuffix}
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}
