import { useTranslations } from 'next-intl';
import { ArrowRight, Play, Sparkles, Star } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { DashboardMockup } from './dashboard-mockup';

export function Hero() {
  const t = useTranslations('hero');

  const stats = [
    { value: '8,400+', label: t('stat1') },
    { value: '2.1M', label: t('stat2') },
    { value: '4.9/5', label: t('stat3') },
    { value: '99.9%', label: t('stat4') },
  ];

  return (
    <section className="relative overflow-hidden bg-brand-radial pt-32 pb-20 sm:pt-40">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-60" />
      <div className="pointer-events-none absolute -top-24 start-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="container relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t('badge')}
          </div>

          <h1 className="animate-fade-up mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            {t('title')}
          </h1>

          <p className="animate-fade-up mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t('subtitle')}
          </p>

          <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="gradient" size="xl" className="w-full sm:w-auto">
              <Link href="/signup">
                {t('ctaPrimary')}
                <ArrowRight className="ltr-flip h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
              <Link href="/book">
                <Play className="h-4 w-4" />
                {t('ctaSecondary')}
              </Link>
            </Button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {t('noCard')}
          </p>
        </div>

        {/* Product mockup */}
        <div className="animate-fade-up relative mx-auto mt-16 max-w-5xl">
          <div className="absolute inset-x-8 -bottom-6 h-24 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative rounded-2xl border bg-card p-2 shadow-glow">
            <DashboardMockup />
          </div>
        </div>

        {/* Stats */}
        <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <dt className="font-display text-3xl font-bold text-gradient">
                {s.value}
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
