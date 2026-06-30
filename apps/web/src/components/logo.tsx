import { CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
        <CalendarCheck className="h-5 w-5" />
      </span>
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight">
          Booking<span className="text-gradient">OS</span>
        </span>
      )}
    </span>
  );
}
