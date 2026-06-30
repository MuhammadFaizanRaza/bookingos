'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Faq() {
  const t = useTranslations('faq');
  const items = ['1', '2', '3', '4', '5'];
  const [open, setOpen] = React.useState<string | null>('1');

  return (
    <section id="faq" className="scroll-mt-20 py-24">
      <div className="container max-w-3xl">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t('title')}
        </h2>
        <div className="mt-12 space-y-3">
          {items.map((i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={cn(
                  'overflow-hidden rounded-2xl border transition-colors',
                  isOpen ? 'bg-card shadow-soft' : 'bg-card/50',
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold">{t(`q${i}`)}</span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-all duration-300',
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-muted-foreground">
                      {t(`a${i}`)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
