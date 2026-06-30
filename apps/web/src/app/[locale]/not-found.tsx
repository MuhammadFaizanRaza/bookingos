import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const t = useTranslations('nav');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-radial p-6 text-center">
      <Logo />
      <p className="mt-10 font-display text-7xl font-bold text-gradient">404</p>
      <p className="mt-4 text-lg text-muted-foreground">
        This page could not be found.
      </p>
      <Button asChild variant="gradient" className="mt-8">
        <Link href="/">{t('dashboard')}</Link>
      </Button>
    </div>
  );
}
