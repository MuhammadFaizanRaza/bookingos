import {
  PageHeaderSkeleton,
  ServiceGroupsSkeleton,
} from '@/components/dashboard/loaders';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />
      <ServiceGroupsSkeleton />
    </div>
  );
}
