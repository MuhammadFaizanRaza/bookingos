import {
  PageHeaderSkeleton,
  StaffGridSkeleton,
} from '@/components/dashboard/loaders';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton action />
      <StaffGridSkeleton />
    </div>
  );
}
