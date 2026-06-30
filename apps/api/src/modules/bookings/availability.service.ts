import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantService } from '../../database/tenant.service';

export interface Slot {
  start: string;    // ISO UTC
  end: string;      // ISO UTC
  staffId: string;
  available: boolean; // false = booked/blocked — still returned so the UI can gray it out
}

interface Interval {
  start: number; // epoch ms
  end: number;
}

// ── Timezone helpers ──────────────────────────────────────────────────────────
// All slot math uses the SALON'S configured timezone so that "9 AM working hours"
// always means 9 AM in the salon's city, regardless of the server's system clock.

/**
 * Returns the UTC offset in milliseconds for `timezone` at the given UTC ms.
 * Positive = east of UTC (e.g. Asia/Karachi → +18 000 000 ms).
 */
function tzOffsetMs(timezone: string, utcMs: number): number {
  const d = new Date(utcMs);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parse = (parts: Intl.DateTimeFormatPart[]) => {
    const p = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? '0');
    // hour12:false can return 24 for midnight — normalise to 0
    const h = p('hour') === 24 ? 0 : p('hour');
    return Date.UTC(p('year'), p('month') - 1, p('day'), h, p('minute'), p('second'));
  };

  const utcLocal = parse(fmt.formatToParts(d));
  const utcReal = parse(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(d),
  );
  return utcLocal - utcReal; // e.g. +18_000_000 for UTC+5
}

/**
 * Returns the UTC timestamp that corresponds to **midnight** on `dateStr`
 * in the given `timezone`.
 *
 * e.g. localDayStartUTC('2026-06-20', 'Asia/Karachi') → 2026-06-19T19:00:00Z
 */
function localDayStartUTC(dateStr: string, timezone: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Use noon UTC as a stable probe (avoids DST transitions that happen at midnight)
  const noonUTC = Date.UTC(y, m - 1, d, 12);
  const offset = tzOffsetMs(timezone, noonUTC);
  // local midnight = UTC midnight minus the offset
  return Date.UTC(y, m - 1, d) - offset;
}

/**
 * Returns the local date string (YYYY-MM-DD) for a UTC epoch in the given timezone.
 */
function localDateStr(utcMs: number, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(utcMs));
}

/**
 * Returns 0 (Sun) – 6 (Sat) for the local day at `dayStartUtcMs` (which is
 * already midnight-local expressed in UTC).  Adding 6 h keeps us safely in
 * the same local day even across DST gaps.
 */
function localDayOfWeek(dayStartUtcMs: number, timezone: string): number {
  const noon = new Date(dayStartUtcMs + 6 * 3_600_000); // 6 AM local = safe
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(noon);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AvailabilityService {
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;

  constructor(private readonly tenants: TenantService) {}

  // ── Main slot query ─────────────────────────────────────────────────────────
  async getSlots(
    tenantId: string,
    params: {
      serviceId: string;
      date: string; // YYYY-MM-DD in the salon's local timezone
      staffId?: string;
      stepMin?: number;
    },
  ): Promise<Slot[]> {
    const db = this.tenants.getClient(tenantId);

    // Fetch service + tenant timezone in parallel
    const [service, tenant] = await Promise.all([
      db.service.findFirst({
        where: { id: params.serviceId },
        include: { staff: { where: { isBookable: true }, select: { id: true } } },
      }),
      db.tenant.findFirst({ where: { id: tenantId }, select: { timezone: true } }),
    ]);

    if (!service) throw new BadRequestException('Service not found');

    const timezone = tenant?.timezone ?? 'UTC';

    // Day boundaries in the salon's local timezone
    const dayStart = localDayStartUTC(params.date, timezone);
    const dayEnd = dayStart + AvailabilityService.DAY_MS;
    const dayOfWeek = localDayOfWeek(dayStart, timezone);

    const step = params.stepMin ?? 15;
    const occupyMin =
      service.durationMin + service.bufferBeforeMin + service.bufferAfterMin;
    const occupyMs = occupyMin * 60_000;

    const eligibleStaffIds = (
      params.staffId
        ? service.staff.filter((s) => s.id === params.staffId)
        : service.staff
    ).map((s) => s.id);

    if (eligibleStaffIds.length === 0) return [];

    // slotMap: apptStart UTC ISO → best slot across all staff.
    // Upgraded to available:true if ANY eligible staff is free.
    const slotMap = new Map<string, Slot>();

    for (const staffId of eligibleStaffIds) {
      const [hours, offs, items] = await Promise.all([
        db.workingHours.findMany({ where: { staffId, dayOfWeek } }),
        db.timeOff.findMany({
          where: {
            staffId,
            startsAt: { lt: new Date(dayEnd) },
            endsAt: { gt: new Date(dayStart) },
          },
        }),
        db.appointmentItem.findMany({
          where: {
            staffId,
            startsAt: { lt: new Date(dayEnd) },
            endsAt: { gt: new Date(dayStart) },
            appointment: { status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
          },
          select: { startsAt: true, endsAt: true },
        }),
      ]);

      if (hours.length === 0) continue;

      // Working-hour windows: startMin/endMin are local-time minutes from midnight.
      // dayStart is already local midnight in UTC, so this math is timezone-correct.
      const workingWindows: Interval[] = hours.map((h) => ({
        start: dayStart + h.startMin * 60_000,
        end: dayStart + h.endMin * 60_000,
      }));

      // Subtract busy blocks to get free intervals
      const busy: Interval[] = [
        ...offs.map((o) => ({
          start: Math.max(o.startsAt.getTime(), dayStart),
          end: Math.min(o.endsAt.getTime(), dayEnd),
        })),
        ...items.map((i) => ({
          start: i.startsAt.getTime(),
          end: i.endsAt.getTime(),
        })),
      ];
      let freeIntervals: Interval[] = [...workingWindows];
      for (const b of busy) {
        freeIntervals = this.subtract(freeIntervals, b);
      }
      freeIntervals = freeIntervals.filter((w) => w.end > w.start);

      // Walk ALL working-hour windows to generate every possible slot
      for (const window of workingWindows) {
        for (
          let cursor = window.start;
          cursor + occupyMs <= window.end;
          cursor += step * 60_000
        ) {
          const apptStart = cursor + service.bufferBeforeMin * 60_000;
          const apptEnd = apptStart + service.durationMin * 60_000;
          const key = new Date(apptStart).toISOString();

          const staffFree = freeIntervals.some(
            (fw) => apptStart >= fw.start && apptEnd <= fw.end,
          );

          const existing = slotMap.get(key);
          if (!existing || (!existing.available && staffFree)) {
            slotMap.set(key, {
              start: key,
              end: new Date(apptEnd).toISOString(),
              staffId,
              available: staffFree,
            });
          }
        }
      }
    }

    const now = Date.now();
    return Array.from(slotMap.values())
      .filter((s) => new Date(s.start).getTime() > now)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  // ── Staff availability check (used at booking time) ─────────────────────────
  /**
   * Returns true if `staffId` is free during [start, end) on the day those
   * times fall in — using the salon's configured timezone for working-hours math.
   */
  async isStaffFree(
    tenantId: string,
    staffId: string,
    start: Date,
    end: Date,
    ignoreAppointmentId?: string,
  ): Promise<boolean> {
    const db = this.tenants.getClient(tenantId);

    // Resolve tenant timezone (same source of truth as getSlots)
    const tenant = await db.tenant.findFirst({
      where: { id: tenantId },
      select: { timezone: true },
    });
    const timezone = tenant?.timezone ?? 'UTC';

    // Find the LOCAL day that `start` falls in, then get its UTC boundaries
    const dateStr = localDateStr(start.getTime(), timezone);
    const dayStart = localDayStartUTC(dateStr, timezone);
    const dayEnd = dayStart + AvailabilityService.DAY_MS;
    const dayOfWeek = localDayOfWeek(dayStart, timezone);

    const hours = await db.workingHours.findMany({ where: { staffId, dayOfWeek } });

    // Working hours windows (same formula as getSlots — dayStart is local midnight)
    const within = hours.some(
      (h) =>
        start.getTime() >= dayStart + h.startMin * 60_000 &&
        end.getTime() <= dayStart + h.endMin * 60_000,
    );
    if (!within) return false;

    const conflicts = await db.appointmentItem.count({
      where: {
        staffId,
        startsAt: { lt: end },
        endsAt: { gt: start },
        appointment: {
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
        },
      },
    });
    if (conflicts > 0) return false;

    const off = await db.timeOff.count({
      where: { staffId, startsAt: { lt: end }, endsAt: { gt: start } },
    });
    return off === 0;
  }

  // ── Interval arithmetic ─────────────────────────────────────────────────────
  private subtract(free: Interval[], busy: Interval): Interval[] {
    const out: Interval[] = [];
    for (const f of free) {
      if (busy.end <= f.start || busy.start >= f.end) {
        out.push(f);
        continue;
      }
      if (busy.start > f.start) out.push({ start: f.start, end: busy.start });
      if (busy.end < f.end) out.push({ start: busy.end, end: f.end });
    }
    return out;
  }

  private parseDateUTC(date: string): number {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!m) throw new BadRequestException('date must be in YYYY-MM-DD format');
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
}
