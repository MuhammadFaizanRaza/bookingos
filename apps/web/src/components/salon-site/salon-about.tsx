import type { Tenant } from '@/lib/types';

interface SalonAboutProps {
  salon: Tenant;
  staffCount?: number;
  servicesCount?: number;
  locationsCount?: number;
  reviewsCount?: number;
}

export function SalonAbout({
  salon,
  staffCount,
  servicesCount,
  locationsCount,
  reviewsCount,
}: SalonAboutProps) {
  const highlights = [
    {
      value: servicesCount != null ? String(servicesCount) : '30+',
      label: 'Services Offered',
    },
    {
      value: staffCount != null ? String(staffCount) : '15+',
      label: 'Expert Specialists',
    },
    {
      value: locationsCount != null ? String(locationsCount) : '2',
      label: locationsCount === 1 ? 'Location' : 'Locations',
    },
    {
      value: reviewsCount != null ? String(reviewsCount) : '500+',
      label: reviewsCount === 1 ? 'Client Review' : 'Client Reviews',
    },
  ];

  return (
    <section id="about" className="py-24 bg-muted/30">
      <div className="container">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Text */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Our Story
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold">About {salon.name}</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {salon.about ??
                `Welcome to ${salon.name} — where beauty meets artistry. We offer a luxurious, personalised experience tailored to every client. Our passionate team of specialists is committed to making you look and feel your absolute best.`}
            </p>
            {(salon.phone || salon.address) && (
              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                {salon.phone && <p>📞 {salon.phone}</p>}
                {salon.address && <p>📍 {salon.address}</p>}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {highlights.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border bg-card p-6 text-center shadow-sm"
              >
                <p className="font-display text-4xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
