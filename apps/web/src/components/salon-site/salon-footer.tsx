import { Calendar, Facebook, Instagram, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tenant } from '@/lib/types';

interface SalonFooterProps {
  salon: Tenant;
  onBookNow: () => void;
}

export function SalonFooter({ salon, onBookNow }: SalonFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      {/* CTA strip */}
      <div
        className="py-16 text-center"
        style={{
          background: `linear-gradient(135deg, ${salon.primaryColor}22 0%, ${salon.primaryColor}08 100%)`,
        }}
      >
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          Ready to look your best?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Book your appointment online in under 2 minutes.
        </p>
        <Button size="lg" className="mt-6 font-semibold shadow-lg" onClick={onBookNow}>
          <Calendar className="mr-2 h-4 w-4" />
          Book Now
        </Button>
      </div>

      {/* Footer grid */}
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ background: salon.primaryColor }}
              >
                {salon.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-display font-bold">{salon.name}</span>
            </div>
            {salon.tagline && (
              <p className="mt-3 text-sm text-muted-foreground">{salon.tagline}</p>
            )}
            {/* Social links */}
            <div className="mt-4 flex gap-2">
              {salon.instagramUrl && (
                <a
                  href={salon.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-accent"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {salon.facebookUrl && (
                <a
                  href={salon.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-accent"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {salon.whatsapp && (
                <a
                  href={`https://wa.me/${salon.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-accent"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold">Contact</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {salon.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <a href={`tel:${salon.phone}`} className="hover:text-foreground">
                    {salon.phone}
                  </a>
                </li>
              )}
              {salon.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{salon.address}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold">Quick Links</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {['#services', '#team', '#locations', '#reviews'].map((href) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {href.replace('#', '').replace(/^\w/, (c) => c.toUpperCase())}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          © {year} {salon.name}. All rights reserved. &nbsp;·&nbsp; Powered by{' '}
          <span className="font-medium text-foreground">BookingOS</span>
        </div>
      </div>
    </footer>
  );
}
