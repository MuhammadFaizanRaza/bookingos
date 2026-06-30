'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SalonHeader } from './salon-header';
import { SalonHero } from './salon-hero';
import { SalonAbout } from './salon-about';
import { SalonServices } from './salon-services';
import { SalonTeam } from './salon-team';
import { SalonLocations } from './salon-locations';
import { SalonReviews } from './salon-reviews';
import { SalonFooter } from './salon-footer';
import { api } from '@/lib/api';
import {
  mockLocations,
  mockReviews,
  mockServices,
  mockStaff,
  mockTenant,
} from '@/lib/mock';
import type { Location, Review, Service, StaffMember, Tenant } from '@/lib/types';

interface SalonWebsiteProps {
  slug: string;
}

export function SalonWebsite({ slug }: SalonWebsiteProps) {
  const locale = useLocale();
  const router = useRouter();

  const [salon, setSalon] = React.useState<Tenant>(mockTenant);
  const [services, setServices] = React.useState<Service[]>(mockServices);
  const [staff, setStaff] = React.useState<StaffMember[]>(mockStaff);
  const [locations, setLocations] = React.useState<Location[]>(mockLocations);
  const [reviews, setReviews] = React.useState<Review[]>(mockReviews);
  const [showFab, setShowFab] = React.useState(false);

  React.useEffect(() => {
    api.public.getSite(slug).then(setSalon).catch(() => {});
    api.public.getServices(slug).then((d) => { if (d.length) setServices(d); }).catch(() => {});
    api.public.getStaff(slug).then((d) => { if (d.length) setStaff(d); }).catch(() => {});
    api.public.getLocations(slug).then((d) => { if (d.length) setLocations(d); }).catch(() => {});
    api.public.getReviews(slug).then((d) => { if (d.length) setReviews(d); }).catch(() => {});
  }, [slug]);

  React.useEffect(() => {
    const handler = () => setShowFab(window.scrollY > 500);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  function goToReserve(opts?: { serviceId?: string; staffId?: string }) {
    const base = `/${locale}/${slug}/reserve`;
    const params = new URLSearchParams();
    if (opts?.serviceId) params.set('service', opts.serviceId);
    if (opts?.staffId) params.set('staff', opts.staffId);
    const qs = params.toString();
    router.push(qs ? `${base}?${qs}` : base);
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const cssVars = { '--color-primary': salon.primaryColor } as React.CSSProperties;

  return (
    <div style={cssVars}>
      <SalonHeader salon={salon} onBookNow={() => goToReserve()} />

      <SalonHero
        salon={salon}
        locationsCount={locations.length}
        staffCount={staff.length}
        reviewsCount={reviews.length}
        avgRating={avgRating}
        onBookNow={() => goToReserve()}
      />

      <SalonAbout
        salon={salon}
        staffCount={staff.length}
        servicesCount={services.length}
        locationsCount={locations.length}
        reviewsCount={reviews.length}
      />

      <SalonServices
        services={services}
        currency={salon.currency}
        locale={salon.locale}
        onBook={(serviceId) => goToReserve({ serviceId })}
      />

      <SalonTeam
        staff={staff}
        onBook={(staffId) => goToReserve({ staffId })}
      />

      <SalonLocations locations={locations} onBookNow={() => goToReserve()} />

      <SalonReviews reviews={reviews} />

      <SalonFooter salon={salon} onBookNow={() => goToReserve()} />

      {/* Floating action button */}
      <div
        className={`fixed bottom-6 end-6 z-40 transition-all duration-300 ${
          showFab
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <Button
          size="lg"
          className="h-14 rounded-full px-6 font-semibold shadow-xl"
          onClick={() => goToReserve()}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Book Now
        </Button>
      </div>
    </div>
  );
}
