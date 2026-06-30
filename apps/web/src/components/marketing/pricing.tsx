'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlanDef {
  key: 'starter' | 'pro' | 'business';
  monthly: number;
  features: string[];
  popular?: boolean;
}

const PLANS: PlanDef[] = [
  { key: 'starter', monthly: 29, features: ['f1', 'f2', 'f3', 'f4', 'f5'] },
  {
    key: 'pro',
    monthly: 69,
    features: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
    popular: true,
  },
  {
    key: 'business',
    monthly: 149,
    features: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
  },
];

export function Pricing() {
  const t = useTranslations('pricing');
  const [yearly, setYearly] = React.useState(false);

  return (
    <section id="pricing" className="scroll-mt-20 bg-muted/20 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={cn('text-sm', !yearly && 'font-semibold')}>
            {t('monthly')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            onClick={() => setYearly((v) => !v)}
            className={cn(
              'relative h-7 w-12 rounded-full transition-colors',
              yearly ? 'bg-primary' : 'bg-muted-foreground/30',
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
                yearly ? 'start-6' : 'start-1',
              )}
            />
          </button>
          <span className={cn('text-sm', yearly && 'font-semibold')}>
            {t('yearly')}
          </span>
          <Badge variant="success">{t('save')}</Badge>
        </div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = yearly
              ? Math.round(plan.monthly * 0.8)
              : plan.monthly;
            return (
              <Card
                key={plan.key}
                className={cn(
                  'relative flex flex-col p-8 transition-all',
                  plan.popular
                    ? 'border-primary/40 shadow-glow lg:-mt-4 lg:mb-4 ring-1 ring-primary/20'
                    : 'hover:shadow-soft',
                )}
              >
                {plan.popular && (
                  <Badge
                    variant="gradient"
                    className="absolute -top-3 start-1/2 -translate-x-1/2 px-4 py-1"
                  >
                    {t('mostPopular')}
                  </Badge>
                )}
                <h3 className="font-display text-xl font-bold">
                  {t(`${plan.key}.name`)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`${plan.key}.desc`)}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold">
                    ${price}
                  </span>
                  <span className="text-muted-foreground">{t('perMonth')}</span>
                </div>

                <ul className="mt-7 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="h-3 w-3" />
                      </span>
                      {t(`${plan.key}.${f}`)}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.popular ? 'gradient' : 'outline'}
                  size="lg"
                  className="mt-8 w-full"
                >
                  <Link href="/signup">
                    {plan.key === 'business' ? t('ctaBusiness') : t('cta')}
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
