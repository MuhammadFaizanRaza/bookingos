import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  BookingSource,
  Prisma,
  Role,
  type Service,
} from '@bookingos/database';
import { TenantService } from '../../database/tenant.service';
import { NotificationService } from '../../messaging/notification.service';
import { add } from '../../common/money';
import { AvailabilityService } from './availability.service';
import {
  AppointmentItemDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  RescheduleBookingDto,
} from './dto/booking.dto';

/** Allowed appointment status transitions. */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly tenants: TenantService,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationService,
  ) {}

  async create(tenantId: string, dto: CreateBookingDto) {
    const db = this.tenants.getClient(tenantId);
    const built = await this.buildItems(tenantId, dto.items, undefined);

    const startsAt = built.reduce(
      (min, i) => (i.startsAt < min ? i.startsAt : min),
      built[0].startsAt,
    );
    const endsAt = built.reduce(
      (max, i) => (i.endsAt > max ? i.endsAt : max),
      built[0].endsAt,
    );
    const total = built.reduce<Prisma.Decimal>(
      (acc, i) => add(acc, i.price),
      new Prisma.Decimal(0),
    );

    const appointment = await db.appointment.create({
      // `tenantId` is stamped automatically by the tenant-scoped client.
      data: {
        clientId: dto.clientId,
        locationId: dto.locationId,
        source: dto.source ?? BookingSource.ADMIN,
        status: AppointmentStatus.CONFIRMED,
        notes: dto.notes,
        startsAt,
        endsAt,
        total,
        items: {
          create: built.map((i) => ({
            serviceId: i.serviceId,
            staffId: i.staffId,
            startsAt: i.startsAt,
            endsAt: i.endsAt,
            price: i.price,
            durationMin: i.durationMin,
            quantity: i.quantity,
          })),
        },
      } as Prisma.AppointmentUncheckedCreateInput,
      include: this.detailInclude(),
    });

    await this.sendConfirmation(tenantId, appointment.id);
    return appointment;
  }

  async findAll(tenantId: string, query: ListBookingsQueryDto) {
    const where: Prisma.AppointmentWhereInput = {};
    if (query.from || query.to) {
      where.startsAt = {};
      if (query.from) where.startsAt.gte = this.parseRange(query.from, false);
      if (query.to) where.startsAt.lte = this.parseRange(query.to, true);
    }
    if (query.status) where.status = query.status;
    if (query.staffId) where.items = { some: { staffId: query.staffId } };

    return this.tenants.getClient(tenantId).appointment.findMany({
      where,
      include: this.detailInclude(),
      orderBy: { startsAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const appt = await this.tenants
      .getClient(tenantId)
      .appointment.findFirst({ where: { id }, include: this.detailInclude() });
    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }
    return appt;
  }

  async reschedule(tenantId: string, id: string, dto: RescheduleBookingDto) {
    const existing = await this.findOne(tenantId, id);
    if (
      existing.status === AppointmentStatus.CANCELLED ||
      existing.status === AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot reschedule a ${existing.status} appointment`,
      );
    }
    const db = this.tenants.getClient(tenantId);
    const built = await this.buildItems(tenantId, dto.items, id);

    const startsAt = built.reduce(
      (min, i) => (i.startsAt < min ? i.startsAt : min),
      built[0].startsAt,
    );
    const endsAt = built.reduce(
      (max, i) => (i.endsAt > max ? i.endsAt : max),
      built[0].endsAt,
    );
    const total = built.reduce<Prisma.Decimal>(
      (acc, i) => add(acc, i.price),
      new Prisma.Decimal(0),
    );

    // Tenant-scoped guard: ensure the appointment belongs to this tenant
    // before mutating its child items via the raw delegate.
    await db.appointmentItem.deleteMany({ where: { appointmentId: id } });
    const updated = await db.appointment.update({
      where: { id },
      data: {
        startsAt,
        endsAt,
        total,
        items: {
          create: built.map((i) => ({
            serviceId: i.serviceId,
            staffId: i.staffId,
            startsAt: i.startsAt,
            endsAt: i.endsAt,
            price: i.price,
            durationMin: i.durationMin,
            quantity: i.quantity,
          })),
        },
      },
      include: this.detailInclude(),
    });
    await this.notifications
      .notify({
        tenantId,
        template: 'appointment.rescheduled',
        payload: { appointmentId: id, startsAt },
        email: updated.client?.email ?? undefined,
        subject: 'Your appointment has been rescheduled',
        body: `Your appointment is now on ${startsAt.toISOString()}.`,
      })
      .catch(() => undefined);
    return updated;
  }

  async cancel(tenantId: string, id: string, reason?: string) {
    const existing = await this.findOne(tenantId, id);
    if (existing.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment already cancelled');
    }
    const updated = await this.tenants.getClient(tenantId).appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: this.detailInclude(),
    });
    await this.notifications
      .notify({
        tenantId,
        template: 'appointment.cancelled',
        payload: { appointmentId: id },
        email: updated.client?.email ?? undefined,
        subject: 'Your appointment was cancelled',
        body: reason ? `Reason: ${reason}` : 'Your appointment was cancelled.',
      })
      .catch(() => undefined);
    return updated;
  }

  async updateStatus(tenantId: string, id: string, status: AppointmentStatus) {
    const existing = await this.findOne(tenantId, id);
    const allowed = TRANSITIONS[existing.status as AppointmentStatus];
    if (!allowed.includes(status)) {
      throw new ConflictException(
        `Cannot transition from ${existing.status} to ${status}`,
      );
    }
    return this.tenants.getClient(tenantId).appointment.update({
      where: { id },
      data: {
        status,
        ...(status === AppointmentStatus.CANCELLED
          ? { cancelledAt: new Date() }
          : {}),
      },
      include: this.detailInclude(),
    });
  }

  getAvailability(
    tenantId: string,
    params: { serviceId: string; date: string; staffId?: string; stepMin?: number },
  ) {
    return this.availability.getSlots(tenantId, params);
  }

  /** DATE_RANGE offerings (hotel/rental): units left for [checkIn, checkOut). */
  checkDateRange(
    tenantId: string,
    params: { serviceId: string; checkIn: Date; checkOut: Date; quantity?: number },
  ) {
    return this.availability.checkDateRange(tenantId, params);
  }

  /** CAPACITY offerings (class/event/restaurant): seats left for a session. */
  checkCapacity(
    tenantId: string,
    params: { serviceId: string; start: Date; quantity?: number },
  ) {
    return this.availability.checkCapacity(tenantId, params);
  }

  // ---- helpers ------------------------------------------------------------

  /**
   * Validates each requested item: loads the service, picks/validates staff,
   * computes end time from duration, and checks the staff is free.
   */
  private async buildItems(
    tenantId: string,
    items: AppointmentItemDto[],
    ignoreAppointmentId: string | undefined,
  ) {
    const db = this.tenants.getClient(tenantId);
    const serviceIds = [...new Set(items.map((i) => i.serviceId))];
    const services = await db.service.findMany({
      where: { id: { in: serviceIds } },
      include: { staff: { select: { id: true } } },
    });
    const byId = new Map<string, Service & { staff: { id: string }[] }>(
      services.map((s) => [s.id, s as Service & { staff: { id: string }[] }]),
    );

    const built = [];
    for (const item of items) {
      const service = byId.get(item.serviceId);
      if (!service) {
        throw new BadRequestException(`Unknown service ${item.serviceId}`);
      }
      // Normalize: class-transformer may deliver startsAt as a raw string or
      // an Invalid Date when the ISO string has no timezone indicator.
      let itemStartsAt: Date;
      if (item.startsAt instanceof Date && !isNaN(item.startsAt.getTime())) {
        itemStartsAt = item.startsAt;
      } else {
        const raw = String(item.startsAt ?? '');
        // Append 'Z' when no timezone is present so V8 always parses as UTC.
        const withTZ = /[Zz]|[+\-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`;
        itemStartsAt = new Date(withTZ);
      }
      if (isNaN(itemStartsAt.getTime())) {
        throw new BadRequestException(
          `Invalid startsAt for service ${service.name} — expected ISO 8601 string`,
        );
      }
      const quantity = item.quantity ?? 1;

      // ── DATE_RANGE: hotel rooms / rentals — check-in → check-out vs inventory
      if (service.bookingMode === 'DATE_RANGE') {
        const checkOut = item.endsAt;
        if (!checkOut || isNaN(checkOut.getTime())) {
          throw new BadRequestException(
            `${service.name}: endsAt (check-out) is required for date-range bookings`,
          );
        }
        const check = await this.availability.checkDateRange(tenantId, {
          serviceId: service.id,
          checkIn: itemStartsAt,
          checkOut,
          quantity,
        });
        if (!check.available) {
          throw new ConflictException(
            `${service.name}: only ${check.unitsLeft} of ${check.inventory} unit(s) available for the selected dates`,
          );
        }
        const nights = Math.max(
          1,
          Math.ceil((checkOut.getTime() - itemStartsAt.getTime()) / 86_400_000),
        );
        built.push({
          serviceId: service.id,
          staffId: undefined as string | undefined,
          startsAt: itemStartsAt,
          endsAt: checkOut,
          price: new Prisma.Decimal(service.price).mul(nights).mul(quantity),
          durationMin: nights * 1440,
          quantity,
        });
        continue;
      }

      // ── CAPACITY: classes / events / restaurant covers — seats per session
      if (service.bookingMode === 'CAPACITY') {
        const check = await this.availability.checkCapacity(tenantId, {
          serviceId: service.id,
          start: itemStartsAt,
          quantity,
        });
        if (!check.available) {
          throw new ConflictException(
            `${service.name}: only ${check.seatsLeft} of ${check.capacity} seat(s) left for this session`,
          );
        }
        built.push({
          serviceId: service.id,
          staffId: undefined as string | undefined,
          startsAt: itemStartsAt,
          endsAt: new Date(itemStartsAt.getTime() + service.durationMin * 60000),
          price: new Prisma.Decimal(service.price).mul(quantity),
          durationMin: service.durationMin,
          quantity,
        });
        continue;
      }

      // ── TIME_SLOT (default): provider + duration ─────────────────────────────
      let staffId = item.staffId;
      // If the supplied staffId doesn't belong to this service (e.g. came from
      // stale/mock data), silently fall back to auto-assign rather than erroring.
      if (staffId && !service.staff.some((s) => s.id === staffId)) {
        staffId = undefined;
      }
      if (!staffId) {
        // Auto-assign: first eligible staff member who is free.
        for (const candidate of service.staff) {
          const start = itemStartsAt;
          const end = new Date(start.getTime() + service.durationMin * 60000);
          if (
            await this.availability.isStaffFree(
              tenantId,
              candidate.id,
              start,
              end,
              ignoreAppointmentId,
            )
          ) {
            staffId = candidate.id;
            break;
          }
        }
        if (!staffId) {
          throw new ConflictException(
            `No staff available for ${service.name} at the requested time`,
          );
        }
      }

      const startsAt = itemStartsAt;
      const endsAt = new Date(startsAt.getTime() + service.durationMin * 60000);

      const free = await this.availability.isStaffFree(
        tenantId,
        staffId,
        startsAt,
        endsAt,
        ignoreAppointmentId,
      );
      if (!free) {
        throw new ConflictException(
          `${service.name}: staff is not available at ${startsAt.toISOString()}`,
        );
      }

      built.push({
        serviceId: service.id,
        staffId,
        startsAt,
        endsAt,
        price: service.price,
        durationMin: service.durationMin,
        quantity,
      });
    }
    return built;
  }

  async getNotifications(tenantId: string, userId: string, role: string) {
    const isManager = ['OWNER', 'SUPER_ADMIN', 'MANAGER'].includes(role);
    const records = await this.tenants.getClient(tenantId).notification.findMany({
      where: {
        template: { startsWith: 'appointment.' },
        ...(isManager ? {} : { userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, userId: true, template: true, payload: true, createdAt: true },
    });

    return records.map((r) => {
      const p = r.payload as { clientName?: string; startsAt?: string };
      const dateStr = p.startsAt ? new Date(p.startsAt).toLocaleDateString() : '';
      const client = p.clientName ? ` — ${p.clientName}` : '';
      const LABELS: Record<string, { title: string; body: string }> = {
        'appointment.confirmed':   { title: 'Booking Confirmed',        body: `Client confirmed${client}${dateStr ? ' on ' + dateStr : ''}` },
        'appointment.staff.new':  { title: 'New Appointment',           body: `New booking${client}${dateStr ? ' on ' + dateStr : ''}` },
        'appointment.owner.new':  { title: 'New Booking Received',      body: `New booking${client}${dateStr ? ' on ' + dateStr : ''}` },
        'appointment.rescheduled':{ title: 'Appointment Rescheduled',   body: `Rescheduled${dateStr ? ' to ' + dateStr : ''}` },
        'appointment.cancelled':  { title: 'Appointment Cancelled',     body: `Appointment${client} was cancelled` },
      };
      const def = LABELS[r.template as string] ?? { title: r.template, body: '' };
      return { id: r.id, title: def.title, body: def.body, type: 'booking' as const, createdAt: r.createdAt.toISOString() };
    });
  }

  private async sendConfirmation(tenantId: string, appointmentId: string) {
    const appt = await this.tenants.getClient(tenantId).appointment.findFirst({
      where: { id: appointmentId },
      include: {
        client: true,
        items: {
          include: {
            staff: { include: { user: { select: { id: true, email: true } } } },
          },
        },
      },
    });
    if (!appt) return;

    // Client confirmation
    if (appt.client?.email) {
      await this.notifications.notify({
        tenantId,
        template: 'appointment.confirmed',
        payload: { appointmentId, startsAt: appt.startsAt, clientName: appt.client.name },
        email: appt.client.email,
        subject: 'Your booking is confirmed',
        body: `See you on ${appt.startsAt.toISOString()}.`,
      }).catch(() => undefined);
    }

    // Notify each assigned staff member
    const notifiedUserIds = new Set<string>();
    for (const item of appt.items) {
      const u = (item.staff as { user?: { id: string; email: string } } | null)?.user;
      if (u?.id && u?.email && !notifiedUserIds.has(u.id)) {
        notifiedUserIds.add(u.id);
        await this.notifications.notify({
          tenantId,
          userId: u.id,
          template: 'appointment.staff.new',
          payload: { appointmentId, startsAt: appt.startsAt, clientName: appt.client?.name ?? 'Walk-in' },
          email: u.email,
          subject: 'New appointment assigned to you',
          body: `New booking${appt.client ? ' for ' + appt.client.name : ''} at ${appt.startsAt.toISOString()}.`,
        }).catch(() => undefined);
      }
    }

    // Notify the tenant owner
    const owner = await this.tenants.getClient(tenantId).user.findFirst({
      where: { role: Role.OWNER },
      select: { id: true, email: true },
    });
    if (owner?.id && !notifiedUserIds.has(owner.id)) {
      await this.notifications.notify({
        tenantId,
        userId: owner.id,
        template: 'appointment.owner.new',
        payload: { appointmentId, startsAt: appt.startsAt, clientName: appt.client?.name ?? 'Walk-in' },
        email: owner.email,
        subject: 'New appointment booked',
        body: `New booking${appt.client ? ' from ' + appt.client.name : ''} at ${appt.startsAt.toISOString()}.`,
      }).catch(() => undefined);
    }
  }

  private detailInclude(): Prisma.AppointmentInclude {
    return {
      client: true,
      location: true,
      items: {
        include: {
          service: { select: { id: true, name: true, durationMin: true } },
          staff: { select: { id: true, color: true, user: { select: { name: true } } } },
        },
      },
    };
  }

  private parseRange(value: string, endOfDay: boolean): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
    }
    return new Date(value);
  }
}
