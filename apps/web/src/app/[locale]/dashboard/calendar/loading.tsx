import {
  PageHeaderSkeleton,
  CalendarSkeleton,
} from '@/components/dashboard/loaders';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="ms-2 h-6 w-56" />
      </div>
      <CalendarSkeleton />
    </div>
  );
}
