import { Injectable, OnModuleInit } from '@nestjs/common';
import { prisma } from '@salonos/database';

/**
 * Thin wrapper exposing the shared PrismaClient singleton from
 * `@salonos/database` as an injectable Nest provider.
 *
 * Use this ONLY for platform-level / cross-tenant data (Tenant lookups,
 * RefreshToken, WebhookEvent, Subscription). For tenant-owned data always
 * go through `TenantService.getClient(tenantId)`.
 */
@Injectable()
export class PrismaService implements OnModuleInit {
  /** The raw, un-scoped Prisma client singleton. */
  readonly client = prisma;

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }
}
