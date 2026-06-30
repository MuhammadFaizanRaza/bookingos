'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const t = useTranslations('nav');
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#features', label: t('features') },
    { href: '#how', label: t('howItWorks') },
    { href: '#pricing', label: t('pricing') },
    { href: '#testimonials', label: t('testimonials') },
    { href: '#faq', label: t('faq') },
  ];

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-border/60 bg-background/80 backdrop-blur-xl'
          : 'bg-transparent',
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t('login')}</Link>
          </Button>
          <Button asChild variant="gradient" size="sm">
            <Link href="/signup">{t('signup')}</Link>
          </Button>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-1 lg:hidden">
          <LanguageSwitcher />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="mt-8 flex flex-col gap-1">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="rounded-lg px-3 py-2.5 text-base font-medium hover:bg-accent"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="my-3 h-px bg-border" />
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">{t('login')}</Link>
                </Button>
                <Button asChild variant="gradient" className="mt-2 w-full">
                  <Link href="/signup">{t('signup')}</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
