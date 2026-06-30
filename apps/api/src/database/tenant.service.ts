import { Injectable } from '@nestjs/common';
import { forTenant, type TenantClient } from '@salonos/database';

/**
 * Factory around `forTenant` from `@salonos/database`. Every tenant-scoped
 * data access in the API goes through this so isolation is enforced at the
 * Prisma layer (defence-in-depth on top of the RBAC guards).
 */
@Injectable()
export class TenantService {
  getClient(tenantId: string): TenantClient {
    return forTenant(tenantId);
  }
}
