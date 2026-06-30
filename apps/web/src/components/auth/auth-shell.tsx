import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/logo';

export function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth');
  const features = ['onlineBooking', 'pos', 'reports', 'crm'] as const;
  const tf = useTranslations('features');

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col p-6 sm:p-10">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-brand-gradient lg:block">
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" />
        <div className="pointer-events-none absolute -bottom-20 -end-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center p-14 text-white">
          <h2 className="font-display text-4xl font-bold leading-tight">
            {t('marketingTitle')}
          </h2>
          <p className="mt-4 max-w-md text-lg text-white/85">
            {t('marketingDesc')}
          </p>
          <ul className="mt-10 space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-lg">{tf(`${f}.title`)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-12 rounded-2xl bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-white/90">
              “We cut no-shows by 60% in the first month.”
            </p>
            <p className="mt-2 text-sm font-medium text-white/70">
              Sofia Marchetti — Lumière Beauty Lounge
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
