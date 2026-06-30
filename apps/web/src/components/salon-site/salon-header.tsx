'use client';

import * as React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { Tenant } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SalonHeaderProps {
  salon: Tenant;
  onBookNow: () => void;
}

const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'Our Team', href: '#team' },
  { label: 'Locations', href: '#locations' },
  { label: 'Reviews', href: '#reviews' },
];

export function SalonHeader({ salon, onBookNow }: SalonHeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b bg-background/95 shadow-sm backdrop-blur-xl'
          : 'bg-transparent',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {salon.logoUrl ? (
            <img
              src={salon.logoUrl}
              alt={salon.name}
              className="h-9 w-9 rounded-xl object-cover"
            />
          ) : (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: salon.primaryColor }}
            >
              {salon.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span
            className={cn(
              'font-display text-lg font-bold transition-colors',
              scrolled ? 'text-foreground' : 'text-white',
            )}
          >
            {salon.name}
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10',
                scrolled
                  ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  : 'text-white/80 hover:text-white',
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onBookNow}
            className={cn(
              'hidden font-semibold md:inline-flex',
              scrolled
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-white text-zinc-900 hover:bg-white/90',
            )}
          >
            Book Now
          </Button>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('md:hidden', !scrolled && 'text-white hover:bg-white/10')}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-2 flex items-center gap-3 border-b pb-4">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: salon.primaryColor }}
                >
                  {salon.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="font-semibold">{salon.name}</p>
                  {salon.tagline && (
                    <p className="text-xs text-muted-foreground">{salon.tagline}</p>
                  )}
                </div>
              </div>
              <nav className="mt-4 flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <Button
                className="mt-6 w-full"
                onClick={() => {
                  setMobileOpen(false);
                  onBookNow();
                }}
              >
                Book Now
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
