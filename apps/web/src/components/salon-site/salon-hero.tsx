'use client';

import { Calendar, MapPin, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tenant } from '@/lib/types';

interface SalonHeroProps {
  salon: Tenant;
  locationsCount: number;
  staffCount: number;
  reviewsCount: number;
  avgRating: number;
  onBookNow: () => void;
}

export function SalonHero({
  salon,
  locationsCount,
  staffCount,
  reviewsCount,
  avgRating,
  onBookNow,
}: SalonHeroProps) {
  return (
    <section className="relative flex min-h-[92vh] items-end pb-16 pt-16">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        {salon.coverImageUrl ? (
          <img
            src={salon.coverImageUrl}
            alt={salon.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${salon.primaryColor}ee 0%, ${salon.primaryColor}88 40%, #0f0a1e 100%)`,
            }}
          />
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative container">
        {/* Rating pill */}
        {reviewsCount > 0 && (
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {avgRating.toFixed(1)} &nbsp;·&nbsp; {reviewsCount} reviews
          </div>
        )}

        <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight text-white sm:text-6xl md:text-7xl">
          {salon.name}
        </h1>

        {salon.tagline && (
          <p className="mt-4 max-w-xl text-xl text-white/75">{salon.tagline}</p>
        )}

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            size="lg"
            onClick={onBookNow}
            className="bg-white font-semibold text-zinc-900 shadow-xl hover:bg-white/90"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Book an Appointment
          </Button>
          <Button
            size="lg"
            variant="ghost"
            asChild
            className="border border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
          >
            <a href="#services">View Services</a>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-10 flex flex-wrap gap-6">
          {locationsCount > 1 && (
            <div className="flex items-center gap-2 text-white/70">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">{locationsCount} Locations</span>
            </div>
          )}
          {staffCount > 0 && (
            <div className="flex items-center gap-2 text-white/70">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{staffCount} Specialists</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
