'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Service } from '@/lib/types';
import { formatCurrency, minutesToLabel } from '@/lib/utils';

interface SalonServicesProps {
  services: Service[];
  currency: string;
  locale: string;
  onBook: (serviceId: string) => void;
}

function ServiceCard({
  service,
  currency,
  locale,
  onBook,
}: {
  service: Service;
  currency: string;
  locale: string;
  onBook: () => void;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div
        className="mb-4 h-1 w-10 rounded-full"
        style={{ background: service.color }}
      />
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{service.name}</h3>
          {service.depositRequired && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              Deposit
            </Badge>
          )}
        </div>
        {service.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
            {service.description}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-bold text-primary">
            {formatCurrency(Number(service.price), currency, locale)}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {minutesToLabel(service.durationMin)}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onBook}
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          Book
        </Button>
      </div>
    </div>
  );
}

export function SalonServices({ services, currency, locale, onBook }: SalonServicesProps) {
  const bookableServices = services.filter((s) => s.onlineBookable && s.isActive);

  // Derive categories from services themselves — keeps tabs in sync with actual data
  const uniqueCategories = Array.from(
    new Map(
      bookableServices
        .filter((s) => s.category)
        .map((s) => [s.category!.id, s.category!]),
    ).values(),
  );

  const tabs = [
    { id: 'all', label: 'All Services', services: bookableServices },
    ...uniqueCategories.map((c) => ({
      id: c.id,
      label: c.name,
      services: bookableServices.filter((s) => s.category?.id === c.id),
    })),
  ];

  if (bookableServices.length === 0) return null;

  return (
    <section id="services" className="py-24">
      <div className="container">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            What We Offer
          </p>
          <h2 className="mt-2 font-display text-4xl font-bold">Our Services</h2>
          <p className="mt-3 text-muted-foreground">
            Premium treatments crafted for every occasion
          </p>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-8 flex h-auto flex-wrap justify-center gap-1 bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-full border px-4 py-1.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                {tab.label}
                <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs text-muted-foreground data-[state=active]:bg-primary-foreground/20 data-[state=active]:text-white">
                  {tab.services.length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tab.services.map((svc) => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    currency={currency}
                    locale={locale}
                    onBook={() => onBook(svc.id)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
