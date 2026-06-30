import { setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Hero } from '@/components/marketing/hero';
import {
  Features,
  FinalCta,
  HowItWorks,
  SocialProof,
  Testimonials,
} from '@/components/marketing/sections';
import { Pricing } from '@/components/marketing/pricing';
import { Faq } from '@/components/marketing/faq';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
