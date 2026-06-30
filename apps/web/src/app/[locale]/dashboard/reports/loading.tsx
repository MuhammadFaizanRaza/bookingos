import {
  PageHeaderSkeleton,
  ChartSkeleton,
} from '@/components/dashboard/loaders';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />
      <ChartSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
