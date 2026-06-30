import {
  PageHeaderSkeleton,
  KpiRowSkeleton,
  ChartSkeleton,
  ListSkeleton,
} from '@/components/dashboard/loaders';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <KpiRowSkeleton count={4} />
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartSkeleton className="lg:col-span-2" />
        <ListSkeleton rows={5} />
      </div>
      <ListSkeleton rows={5} />
    </div>
  );
}
