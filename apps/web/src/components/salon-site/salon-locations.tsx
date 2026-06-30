import { Clock, ExternalLink, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Location } from '@/lib/types';

interface SalonLocationsProps {
  locations: Location[];
  onBookNow: (locationId?: string) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function minsToTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function LocationCard({
  location,
  index,
  onBook,
}: {
  location: Location;
  index: number;
  onBook: () => void;
}) {
  const hours = location.workingHours ?? [];
  const openDays = hours
    .filter((h) => h.dayOfWeek !== 0)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const mapsUrl = location.address
    ? `https://maps.google.com/?q=${encodeURIComponent(
        `${location.address} ${location.city ?? ''}`,
      )}`
    : null;

  return (
    <div className="group relative overflow-hidden rounded-3xl border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      {/* Top accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold leading-tight">{location.name}</h3>
              {location.city && (
                <p className="text-xs font-medium text-muted-foreground">{location.city}</p>
              )}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            Open
          </span>
        </div>

        {/* Contact info */}
        <div className="space-y-2.5">
          {location.address && (
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground leading-snug">
                {location.address}
                {location.city && `, ${location.city}`}
              </span>
            </div>
          )}
          {location.phone && (
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={`tel:${location.phone}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {location.phone}
              </a>
            </div>
          )}
        </div>

        {/* Working hours */}
        {openDays.length > 0 && (
          <div className="mt-4 rounded-2xl bg-muted/50 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Hours
            </div>
            <div className="space-y-1">
              {openDays.map((h) => (
                <div key={h.dayOfWeek} className="flex items-center justify-between">
                  <span className="w-8 shrink-0 text-xs font-medium text-foreground">
                    {DAY_NAMES[h.dayOfWeek]}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {minsToTime(h.startMin)} – {minsToTime(h.endMin)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="w-8 shrink-0 text-xs font-medium text-foreground">Sun</span>
                <span className="text-xs italic text-muted-foreground">Closed</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <Button className="flex-1 font-semibold" onClick={onBook}>
            Book Here
          </Button>
          {mapsUrl && (
            <Button variant="outline" size="icon" asChild className="shrink-0">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label="Get Directions">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SalonLocations({ locations, onBookNow }: SalonLocationsProps) {
  if (!locations.length) return null;

  return (
    <section id="locations" className="bg-muted/30 py-24">
      <div className="container">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Find Us
          </p>
          <h2 className="mt-2 font-display text-4xl font-bold">Our Locations</h2>
          <p className="mt-3 text-muted-foreground">
            {locations.length > 1
              ? `${locations.length} convenient locations across the city`
              : 'Come visit us'}
          </p>
        </div>

        <div
          className={
            locations.length === 1
              ? 'mx-auto max-w-sm'
              : locations.length === 2
              ? 'mx-auto grid max-w-2xl gap-6 sm:grid-cols-2'
              : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
          }
        >
          {locations.map((loc, i) => (
            <LocationCard
              key={loc.id}
              location={loc}
              index={i}
              onBook={() => onBookNow(loc.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
