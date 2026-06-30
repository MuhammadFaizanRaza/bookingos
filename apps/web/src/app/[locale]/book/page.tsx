import { redirect } from 'next/navigation';

// Legacy route — redirect to the proper salon URL
export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/lumiere`);
}
