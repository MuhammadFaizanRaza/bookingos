'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Lock,
  LogOut,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  UserCog,
} from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Logo } from '@/components/logo';
import { useAuth } from '@/components/auth-provider';
import { useTenant } from '@/hooks/use-salon-data';
import { useTerms } from '@/hooks/use-terms';
import { hasFeature } from '@/lib/plans';
import type { Feature } from '@/lib/plans';
import { getAllowedSections } from '@/lib/permissions';
import type { Section } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, initials } from '@/lib/utils';

const NAV: Array<{
  href: string;
  key: string;
  section: Section;
  icon: React.ElementType;
  exact?: boolean;
  feature?: Feature;
}> = [
  { href: '/dashboard', key: 'overview', section: 'overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/calendar', key: 'calendar', section: 'calendar', icon: CalendarDays },
  { href: '/dashboard/clients', key: 'clients', section: 'clients', icon: Users },
  { href: '/dashboard/services', key: 'services', section: 'services', icon: Tag },
  { href: '/dashboard/staff', key: 'staff', section: 'staff', icon: UserCog },
  { href: '/dashboard/pos', key: 'pos', section: 'pos', icon: ShoppingCart },
  { href: '/dashboard/reports', key: 'reports', section: 'reports', icon: BarChart3, feature: 'reports' as Feature },
  { href: '/dashboard/settings', key: 'settings', section: 'settings', icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('dashboard.nav');
  const tt = useTranslations('dashboard');
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: tenant } = useTenant();
  const terms = useTerms();
  const router = useRouter();

  // Vertical-aware labels for the entity-named nav items; everything else
  // keeps its translated label.
  const navLabel = (key: string): string => {
    switch (key) {
      case 'clients':
        return terms.customerPlural;
      case 'services':
        return terms.offeringPlural;
      case 'staff':
        return terms.resourcePlural;
      default:
        return t(key);
    }
  };

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const allowedSections = user ? getAllowedSections(user.role) : getAllowedSections('OWNER');
  const visibleNav = NAV.filter((item) => allowedSections.includes(item.section));

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b px-5">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNav.map((item) => {
          const active =
            item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const locked =
            item.feature !== undefined && !hasFeature(tenant?.plan, item.feature);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{navLabel(item.key)}</span>
              {locked && (
                <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatarUrl ?? undefined} />
              <AvatarFallback>{initials(user?.name ?? 'Demo Owner')}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user?.name ?? 'Demo Owner'}
              </p>
              <p className="truncate text-xs text-muted-foreground capitalize">
                {user?.role?.toLowerCase() ?? 'owner'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={tt('logout')}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
