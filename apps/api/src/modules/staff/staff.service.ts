import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@bookingos/database';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { TenantService } from '../../database/tenant.service';
import { PLAN_LIMITS } from '../billing/billing.service';
import {
  CreateStaffDto,
  CreateTimeOffDto,
  SetWorkingHoursDto,
  UpdateStaffDto,
} from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly tenants: TenantService,
    private readonly prisma: PrismaService,
  ) {}

  /** Blocks creating staff beyond the tenant's plan limit. */
  private async assertWithinPlanLimit(tenantId: string) {
    const tenant = await this.prisma.client.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { plan: true },
    });
    const limit = PLAN_LIMITS[tenant.plan].maxStaff;
    const count = await this.prisma.client.staffProfile.count({
      where: { tenantId },
    });
    if (count >= limit) {
      throw new ForbiddenException(
        `Your ${tenant.plan} plan allows up to ${limit} staff member(s). Upgrade your plan to add more.`,
      );
    }
  }

  /** Creates a User (role STAFF) + linked StaffProfile in one transaction. */
  async create(tenantId: string, dto: CreateStaffDto) {
    await this.assertWithinPlanLimit(tenantId);
    const { name, email, password, phone, serviceIds, ...profile } = dto;
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    return this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { tenantId_email: { tenantId, email: email.toLowerCase() } },
      });
      if (existing) {
        throw new BadRequestException('A user with this email already exists');
      }

      const user = await tx.user.create({
        data: {
          tenantId,
          email: email.toLowerCase(),
          name,
          phone,
          role: Role.STAFF,
          status: passwordHash ? UserStatus.ACTIVE : UserStatus.INVITED,
          passwordHash,
        },
      });

      return tx.staffProfile.create({
        data: {
          tenantId,
          userId: user.id,
          locationId: profile.locationId,
          title: profile.title,
          bio: profile.bio,
          color: profile.color,
          isBookable: profile.isBookable,
          commissionRate:
            profile.commissionRate != null
              ? new Prisma.Decimal(profile.commissionRate)
              : undefined,
          services: serviceIds
            ? { connect: serviceIds.map((id) => ({ id })) }
            : undefined,
        },
        include: { user: true, services: true },
      });
    });
  }

  findAll(tenantId: string, bookableOnly?: boolean) {
    return this.tenants.getClient(tenantId).staffProfile.findMany({
      where: bookableOnly ? { isBookable: true } : {},
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        services: { select: { id: true, name: true } },
        workingHours: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const staff = await this.tenants.getClient(tenantId).staffProfile.findFirst({
      where: { id },
      include: {
        user: true,
        services: true,
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
        timeOff: { orderBy: { startsAt: 'asc' } },
      },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }
    return staff;
  }

  async update(tenantId: string, id: string, dto: UpdateStaffDto) {
    const staff = await this.findOne(tenantId, id);
    const { name, email, password, phone, serviceIds, role, ...profile } = dto;

    // User-side fields (including role change)
    if (name || email || password || phone || role) {
      await this.prisma.client.user.update({
        where: { id: staff.userId },
        data: {
          ...(name ? { name } : {}),
          ...(email ? { email: email.toLowerCase() } : {}),
          ...(phone ? { phone } : {}),
          ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
          ...(role ? { role } : {}),
        },
      });
    }

    return this.tenants.getClient(tenantId).staffProfile.update({
      where: { id },
      data: {
        locationId: profile.locationId,
        title: profile.title,
        bio: profile.bio,
        color: profile.color,
        isBookable: profile.isBookable,
        ...(profile.commissionRate != null
          ? { commissionRate: new Prisma.Decimal(profile.commissionRate) }
          : {}),
        ...(serviceIds
          ? { services: { set: serviceIds.map((sid) => ({ id: sid })) } }
          : {}),
      },
      include: { user: true, services: true },
    });
  }

  async remove(tenantId: string, id: string) {
    const staff = await this.findOne(tenantId, id);
    // Deleting the profile cascades; also disable the underlying user.
    await this.prisma.client.user.update({
      where: { id: staff.userId },
      data: { status: UserStatus.DISABLED },
    });
    return this.tenants
      .getClient(tenantId)
      .staffProfile.delete({ where: { id } });
  }

  // ---- Working hours ------------------------------------------------------

  async setWorkingHours(tenantId: string, id: string, dto: SetWorkingHoursDto) {
    await this.findOne(tenantId, id);
    for (const h of dto.hours) {
      if (h.endMin <= h.startMin) {
        throw new BadRequestException(
          `endMin must be greater than startMin (day ${h.dayOfWeek})`,
        );
      }
    }
    await this.prisma.client.$transaction([
      this.prisma.client.workingHours.deleteMany({ where: { staffId: id } }),
      this.prisma.client.workingHours.createMany({
        data: dto.hours.map((h) => ({ staffId: id, ...h })),
      }),
    ]);
    return this.prisma.client.workingHours.findMany({
      where: { staffId: id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  // ---- Time off -----------------------------------------------------------

  async addTimeOff(tenantId: string, id: string, dto: CreateTimeOffDto) {
    await this.findOne(tenantId, id);
    if (dto.endsAt <= dto.startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    return this.prisma.client.timeOff.create({
      data: {
        staffId: id,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        reason: dto.reason,
      },
    });
  }

  async removeTimeOff(tenantId: string, id: string, timeOffId: string) {
    await this.findOne(tenantId, id);
    const result = await this.prisma.client.timeOff.deleteMany({
      where: { id: timeOffId, staffId: id },
    });
    if (result.count === 0) {
      throw new NotFoundException('Time off entry not found');
    }
    return { success: true };
  }
}
