import { SalonWebsite } from '@/components/salon-site/salon-website';

export default async function SalonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  return <SalonWebsite slug={slug} />;
}
