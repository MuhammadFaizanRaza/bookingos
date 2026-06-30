import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingSource, Prisma } from '@salonos/database';
import { TenantService } from '../../database/tenant.service';
import { PrismaService } from '../../database/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { PublicBookingDto } from './dto/public-booking.dto';

/**
 * Powers the white-label customer-facing booking site. All methods take a
 * resolved tenantId (from the slug/subdomain). No auth required.
 */
@Injectable()
export class PublicService {
  constructor(
    private readonly tenants: TenantService,
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
  ) {}

  /** Branding + locale for theming the booking site. */
  async getSite(tenantId: string) {
    const tenant = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        tagline: true,
        locale: true,
        currency: true,
        timezone: true,
        coverImageUrl: true,
        about: true,
        phone: true,
        address: true,
        instagramUrl: true,
        facebookUrl: true,
        whatsapp: true,
        bookingEnabled: true,
      },
    });
    const locations = await this.tenants.getClient(tenantId).location.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true, city: true, phone: true },
    });
    return { ...tenant, locations };
  }

  /** Online-bookable services grouped by category. */
  async getServices(tenantId: string) {
    return this.tenants.getClient(tenantId).service.findMany({
      where: { isActive: true, onlineBookable: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationMin: true,
        price: true,
        color: true,
        imageUrl: true,
        depositRequired: true,
        depositAmount: true,
        category: { select: { id: true, name: true, sortOrder: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Bookable staff (optionally for a given service). */
  async getStaff(tenantId: string, serviceId?: string) {
    return this.tenants.getClient(tenantId).staffProfile.findMany({
      where: {
        isBookable: true,
        ...(serviceId ? { services: { some: { id: serviceId } } } : {}),
      },
      select: {
        id: true,
        title: true,
        bio: true,
        color: true,
        user: { select: { name: true, avatarUrl: true } },
      },
    });
  }

  getAvailability(
    tenantId: string,
    params: { serviceId: string; date: string; staffId?: string },
  ) {
    return this.bookings.getAvailability(tenantId, params);
  }

  /** Guest booking: find-or-create the client by email/phone, then book. */
  async createBooking(tenantId: string, dto: PublicBookingDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Provide an email or phone number');
    }
    const db = this.tenants.getClient(tenantId);

    let client = await db.client.findFirst({
      where: {
        OR: [
          ...(dto.email ? [{ email: dto.email.toLowerCase() }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });
    if (!client) {
      // `tenantId` is stamped automatically by the tenant-scoped client.
      client = await db.client.create({
        data: {
          name: dto.name,
          email: dto.email?.toLowerCase(),
          phone: dto.phone,
        } as Prisma.ClientUncheckedCreateInput,
      });
    }

    return this.bookings.create(tenantId, {
      clientId: client.id,
      source: BookingSource.ONLINE,
      notes: dto.notes,
      items: dto.items.map((i) => ({
        serviceId: i.serviceId,
        staffId: i.staffId,
        startsAt: i.startsAt,
      })),
    });
  }

  /** Active locations for the booking site map/info section. */
  getLocations(tenantId: string) {
    return this.tenants.getClient(tenantId).location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        country: true,
        phone: true,
        email: true,
        timezone: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Published reviews for social proof on the booking site. */
  async getReviews(tenantId: string) {
    const rows = await this.tenants.getClient(tenantId).review.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        client: { select: { name: true } },
        staff: { select: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      clientName: r.client?.name ?? 'Anonymous',
      staffName: r.staff?.user?.name ?? null,
      serviceName: null,
    }));
  }
}
