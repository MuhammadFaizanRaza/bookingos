import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/logo';

export function SiteFooter() {
  const t = useTranslations('footer');
  const tn = useTranslations('nav');

  const columns = [
    {
      title: t('product'),
      links: [
        { label: tn('features'), href: '#features' },
        { label: tn('pricing'), href: '#pricing' },
        { label: tn('bookNow'), href: '/book' },
      ],
    },
    {
      title: t('company'),
      links: [
        { label: t('about'), href: '#' },
        { label: t('careers'), href: '#' },
        { label: t('blog'), href: '#' },
      ],
    },
    {
      title: t('resources'),
      links: [
        { label: t('help'), href: '#' },
        { label: t('contact'), href: '#' },
        { label: tn('faq'), href: '#faq' },
      ],
    },
    {
      title: t('legal'),
      links: [
        { label: t('privacy'), href: '#' },
        { label: t('terms'), href: '#' },
      ],
    },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-16">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {t('tagline')}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} SalonOS. {t('rights')}
          </p>
          <p className="flex items-center gap-1.5">
            Made with care for salons worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
}
