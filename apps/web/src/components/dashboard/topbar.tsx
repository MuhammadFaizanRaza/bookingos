'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Bell,
  CalendarCheck,
  Menu,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/use-salon-data';
import { cn, timeAgo } from '@/lib/utils';
import { Sidebar } from './sidebar';

const LAST_READ_KEY = 'bookingos.notif.lastRead';

function getLastRead(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_READ_KEY);
}

function setLastRead() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_READ_KEY, new Date().toISOString());
  }
}

export function Topbar() {
  const t = useTranslations('dashboard');
  const tn = useTranslations('dashboard.notifications');
  const { data: notifications = [] } = useNotifications();

  const [lastRead, setLastReadState] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setLastReadState(getLastRead());
  }, []);

  const unread = lastRead
    ? notifications.filter((n) => n.createdAt > lastRead).length
    : notifications.length;

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v) {
      setLastRead();
      setLastReadState(new Date().toISOString());
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t('search')} className="ps-9" />
      </div>

      <div className="ms-auto flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />

        <DropdownMenu open={open} onOpenChange={handleOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={tn('title')}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">{tn('title')}</p>
              {unread > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {unread} new
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {tn('empty')}
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((n) => {
                  const isNew = lastRead ? n.createdAt > lastRead : true;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'flex gap-3 px-4 py-3 transition-colors hover:bg-accent',
                        isNew && 'bg-primary/5',
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                        <CalendarCheck className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{n.title}</p>
                          {isNew && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
