import { ReservePage } from '@/components/booking/reserve-page';

export default async function ReserveRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ service?: string; staff?: string }>;
}) {
  const { slug } = await params;
  const { service, staff } = await searchParams;
  return (
    <ReservePage
      slug={slug}
      preSelectedServiceId={service}
      preSelectedStaffId={staff}
    />
  );
}
