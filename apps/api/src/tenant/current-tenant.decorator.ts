import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Tenant } from '@bookingos/database';
import type { RequestWithTenant } from '../common/types';

/**
 * Injects the resolved tenant id (string) by default, or the full Tenant
 * record when called as `@CurrentTenant('tenant')`. Throws 400 if no tenant
 * was resolved by the TenantMiddleware — i.e. the caller forgot the
 * `x-tenant-slug` header / subdomain.
 */
export const CurrentTenant = createParamDecorator(
  (data: 'id' | 'tenant' | undefined, ctx: ExecutionContext): string | Tenant => {
    const req = ctx.switchToHttp().getRequest<RequestWithTenant>();
    if (!req.tenant || !req.tenantId) {
      throw new BadRequestException(
        'No tenant resolved. Provide the x-tenant-slug header or use a tenant subdomain.',
      );
    }
    return data === 'tenant' ? req.tenant : req.tenantId;
  },
);
