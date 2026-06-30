import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import {
  Plan,
  Role,
  SubscriptionStatus,
  TenantStatus,
  UserStatus,
  Vertical,
  type User,
} from '@bookingos/database';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import type { JwtPayload } from './strategies/jwt.strategy';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const TRIAL_DAYS = 14;

interface SessionContext {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Salon signup: creates Tenant + OWNER user + TRIAL subscription atomically. */
  async register(dto: RegisterDto, ctx: SessionContext = {}) {
    const reserved = (this.config.get<string>('RESERVED_SUBDOMAINS') ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase());
    if (reserved.includes(dto.slug)) {
      throw new BadRequestException(`"${dto.slug}" is a reserved subdomain`);
    }

    const existing = await this.prisma.client.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Subdomain "${dto.slug}" is already taken`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { tenant, owner } = await this.prisma.client.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: dto.salonName,
            slug: dto.slug,
            vertical: dto.vertical ?? Vertical.SALON,
            status: TenantStatus.TRIAL,
            plan: Plan.STARTER,
            trialEndsAt,
            subscription: {
              create: {
                plan: Plan.STARTER,
                status: SubscriptionStatus.TRIALING,
                currentPeriodEnd: trialEndsAt,
              },
            },
          },
        });

        const owner = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: dto.email.toLowerCase(),
            name: dto.ownerName,
            role: Role.OWNER,
            status: UserStatus.ACTIVE,
            passwordHash,
          },
        });

        return { tenant, owner };
      },
    );

    const tokens = await this.issueTokens(owner, ctx);
    return { tenant: this.publicTenant(tenant), user: this.publicUser(owner), ...tokens };
  }

  async login(dto: LoginDto, slugFromCtx: string | undefined, ctx: SessionContext = {}) {
    const slug = (dto.slug ?? slugFromCtx)?.toLowerCase();

    let user: User | null = null;
    if (slug) {
      const tenant = await this.prisma.client.tenant.findUnique({
        where: { slug },
      });
      if (!tenant) {
        throw new UnauthorizedException('Invalid credentials');
      }
      user = await this.prisma.client.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: dto.email.toLowerCase() } },
      });
    } else {
      // No tenant context: allow login if the email is globally unique
      // (covers SUPER_ADMIN with tenantId null, and convenience for single-tenant emails).
      const matches = await this.prisma.client.user.findMany({
        where: { email: dto.email.toLowerCase() },
        take: 2,
      });
      if (matches.length > 1) {
        throw new BadRequestException(
          'Email exists in multiple salons. Provide the salon slug.',
        );
      }
      user = matches[0] ?? null;
    }

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('Account disabled');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user, ctx);
    return { user: this.publicUser(user), ...tokens };
  }

  /** Rotating refresh: validate stored hash, revoke it, issue a fresh pair. */
  async refresh(refreshToken: string, ctx: SessionContext = {}) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Rotate: revoke the used token, then issue new pair.
    await this.prisma.client.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user, ctx);
    return { user: this.publicUser(user), ...tokens };
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { tenant: true, staffProfile: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      ...this.publicUser(user),
      tenant: user.tenant ? this.publicTenant(user.tenant) : null,
      staffProfileId: user.staffProfile?.id ?? null,
    };
  }

  // ---- internals ----------------------------------------------------------

  private async issueTokens(user: User, ctx: SessionContext) {
    const accessPayload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      name: user.name,
      type: 'access',
    };

    const accessOptions: JwtSignOptions = {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ??
        '15m') as JwtSignOptions['expiresIn'],
    };
    const accessToken = await this.jwt.signAsync(accessPayload, accessOptions);

    const refreshPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      type: 'refresh' as const,
      jti: randomBytes(16).toString('hex'),
    };
    const refreshOptions: JwtSignOptions = {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.config.get<string>('JWT_REFRESH_TTL') ??
        '30d') as JwtSignOptions['expiresIn'],
    };
    const refreshToken = await this.jwt.signAsync(refreshPayload, refreshOptions);

    const decoded = this.jwt.decode(refreshToken) as { exp: number };
    await this.prisma.client.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        userAgent: ctx.userAgent,
        ip: ctx.ip,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private publicUser(user: User) {
    const { passwordHash, ...rest } = user;
    void passwordHash;
    return rest;
  }

  private publicTenant<T extends { id: string }>(tenant: T) {
    return tenant;
  }
}
