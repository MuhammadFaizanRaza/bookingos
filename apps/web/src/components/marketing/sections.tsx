import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  BarChart3,
  Boxes,
  CalendarDays,
  CreditCard,
  Globe2,
  Heart,
  MapPin,
  MessageSquareHeart,
  Quote,
  Star,
  UserCog,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

export function SocialProof() {
  const t = useTranslations('social');
  const brands = [
    'Lumière',
    'Glow Studio',
    'Barber & Co.',
    'Velvet Spa',
    'Aura Beauty',
    'Maison Rouge',
  ];
  return (
    <section className="border-y bg-muted/20 py-12">
      <div className="container">
        <p className="text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {t('title')}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-70">
          {brands.map((b) => (
            <span
              key={b}
              className="font-display text-xl font-semibold text-muted-foreground"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Features() {
  const t = useTranslations('features');
  const features = [
    { key: 'onlineBooking', icon: CalendarDays },
    { key: 'calendar', icon: CalendarDays },
    { key: 'pos', icon: CreditCard },
    { key: 'reports', icon: BarChart3 },
    { key: 'crm', icon: Users },
    { key: 'staff', icon: UserCog },
    { key: 'inventory', icon: Boxes },
    { key: 'reminders', icon: MessageSquareHeart },
    { key: 'multiLocation', icon: MapPin },
    { key: 'multiLanguage', icon: Globe2 },
  ] as const;

  return (
    <section id="features" className="scroll-mt-20 py-24">
      <div className="container">
        <SectionHeading title={t('title')} subtitle={t('subtitle')} />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.key}
              className="group relative overflow-hidden p-6 transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="absolute -end-6 -top-6 h-24 w-24 rounded-full bg-brand-gradient opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">
                  {t(`${f.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`${f.key}.desc`)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const t = useTranslations('how');
  const steps = ['step1', 'step2', 'step3'] as const;
  return (
    <section id="how" className="scroll-mt-20 bg-muted/20 py-24">
      <div className="container">
        <SectionHeading title={t('title')} subtitle={t('subtitle')} />
        <div className="relative mt-16 grid gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s} className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-2xl font-bold text-white shadow-glow">
                {i + 1}
              </div>
              <h3 className="mt-6 text-xl font-semibold">{t(`${s}.title`)}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t(`${s}.desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const t = useTranslations('testimonials');
  const items = ['t1', 't2', 't3'] as const;
  return (
    <section id="testimonials" className="scroll-mt-20 py-24">
      <div className="container">
        <SectionHeading title={t('title')} subtitle={t('subtitle')} />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((it) => (
            <Card key={it} className="flex flex-col p-7">
              <Quote className="h-8 w-8 text-primary/30" />
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="mt-4 flex-1 text-base leading-relaxed">
                “{t(`${it}.quote`)}”
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient font-semibold text-white">
                  {t(`${it}.name`).charAt(0)}
                </span>
                <div>
                  <p className="font-semibold">{t(`${it}.name`)}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(`${it}.role`)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const t = useTranslations('cta');
  return (
    <section className="py-24">
      <div className="container">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand-gradient px-6 py-16 text-center text-white shadow-glow sm:px-16 sm:py-20">
          <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" />
          <Heart className="mx-auto h-10 w-10" />
          <h2 className="mt-5 font-display text-3xl font-bold sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
            {t('subtitle')}
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-white px-10 text-base font-semibold text-primary shadow-lg transition-transform hover:scale-[1.03]"
          >
            {t('button')}
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
    </div>
  );
}
