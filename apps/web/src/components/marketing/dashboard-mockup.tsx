import {
  CalendarDays,
  DollarSign,
  LayoutDashboard,
  Scissors,
  TrendingUp,
  Users,
} from 'lucide-react';

// A lightweight, self-contained illustration of the product UI for the hero.
// Purely presentational — no data fetching — so it renders instantly.
export function DashboardMockup() {
  const bars = [40, 62, 48, 78, 56, 88, 72, 95, 68, 84];

  return (
    <div className="overflow-hidden rounded-xl bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-rose-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="ms-3 h-5 w-48 rounded-full bg-muted" />
      </div>

      <div className="grid grid-cols-12">
        {/* Sidebar */}
        <aside className="col-span-3 hidden flex-col gap-1 border-e p-3 sm:flex">
          {(
            [
              { icon: LayoutDashboard, active: true },
              { icon: CalendarDays },
              { icon: Users },
              { icon: Scissors },
              { icon: TrendingUp },
            ] as { icon: typeof Users; active?: boolean }[]
          ).map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${
                item.active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <div
                className={`h-2.5 w-16 rounded-full ${
                  item.active ? 'bg-primary/40' : 'bg-muted'
                }`}
              />
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="col-span-12 space-y-4 p-4 sm:col-span-9">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: DollarSign, label: 'Revenue', value: '$1,245', tint: 'text-emerald-500' },
              { icon: CalendarDays, label: 'Appts', value: '14', tint: 'text-violet-500' },
              { icon: Users, label: 'New', value: '4', tint: 'text-fuchsia-500' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border bg-card p-3">
                <k.icon className={`h-4 w-4 ${k.tint}`} />
                <div className="mt-2 font-display text-lg font-bold">
                  {k.value}
                </div>
                <div className="text-[10px] text-muted-foreground">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 h-2.5 w-28 rounded-full bg-muted" />
            <div className="flex h-28 items-end gap-2">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-brand-gradient"
                  style={{ height: `${h}%`, opacity: 0.55 + (i / bars.length) * 0.45 }}
                />
              ))}
            </div>
          </div>

          {/* Upcoming list */}
          <div className="rounded-xl border bg-card p-3">
            {[
              { c: 'bg-violet-400', w: 'w-24' },
              { c: 'bg-fuchsia-400', w: 'w-32' },
              { c: 'bg-sky-400', w: 'w-20' },
            ].map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b py-2 last:border-0"
              >
                <span className={`h-7 w-7 rounded-full ${r.c} opacity-70`} />
                <div className="flex-1 space-y-1.5">
                  <div className={`h-2 ${r.w} rounded-full bg-muted`} />
                  <div className="h-2 w-16 rounded-full bg-muted/60" />
                </div>
                <div className="h-5 w-12 rounded-full bg-primary/15" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
