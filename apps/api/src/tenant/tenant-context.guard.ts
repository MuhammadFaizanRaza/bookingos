import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import type { RequestWithTenant } from '../common/types';

/**
 * Binds the request to the authenticated user's OWN tenant, authoritatively.
 *
 * The `TenantMiddleware` resolves a tenant from the client-supplied
 * `x-tenant-slug` header / subdomain — which is correct for public, unauthenticated
 * routes (guest booking on a tenant's site). But for an authenticated user we must
 * NEVER trust the client header to choose the tenant: doing so lets any logged-in
 * user read/write another tenant's data just by changing the header (broken tenant
 * isolation / IDOR).
 *
 * This guard runs after `JwtAuthGuard`. For any authenticated, non-public request
 * made by a tenant-bound user, it forces `req.tenant`/`req.tenantId` to the tenant
 * encoded in the user's JWT, ignoring whatever the header said. `SUPER_ADMIN`
 * (a platform user with `tenantId === null`) is exempt and may target a tenant via
 * the header.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithTenant>();
    const user = req.user;

    // No user on a non-public route → JwtAuthGuard will already have rejected.
    if (!user) {
      return true;
    }

    // Platform super-admins are not bound to a tenant; let the header stand.
    if (!user.tenantId) {
      return true;
    }

    // Authoritative binding: the user's token decides the tenant, not the client.
    if (req.tenant?.id !== user.tenantId) {
      const tenant = await this.prisma.client.tenant.findUnique({
        where: { id: user.tenantId },
      });
      if (!tenant) {
        throw new ForbiddenException('Authenticated user has no valid tenant');
      }
      req.tenant = tenant;
      req.tenantId = tenant.id;
    }

    return true;
  }
}
