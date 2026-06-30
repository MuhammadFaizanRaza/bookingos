import {
  PageHeaderSkeleton,
  TableSkeleton,
} from '@/components/dashboard/loaders';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />
      <Skeleton className="h-10 max-w-md" />
      <TableSkeleton rows={6} columns={6} />
    </div>
  );
}
