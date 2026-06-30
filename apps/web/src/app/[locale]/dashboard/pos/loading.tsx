import {
  PageHeaderSkeleton,
  CardGridSkeleton,
} from '@/components/dashboard/loaders';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <Skeleton className="mb-3 h-4 w-28" />
          <CardGridSkeleton
            count={6}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
            cardClassName="h-28"
          />
        </div>
        <Card className="h-fit">
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
