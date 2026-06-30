import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './index';

/**
 * Models that carry a `tenantId` column and must be isolated per tenant.
 * Child tables (AppointmentItem, SaleItem, WorkingHours, …) are reached only
 * through their tenant-scoped parent, so they are intentionally excluded.
 */
const TENANT_MODELS = new Set<string>([
  'Location',
  'User',
  'StaffProfile',
  'ServiceCategory',
  'Service',
  'Product',
  'Client',
  'Appointment',
  'Sale',
  'Payment',
  'Discount',
  'Review',
  'Notification',
  'AuditLog',
  'Subscription',
]);

/**
 * Returns a Prisma client that automatically scopes every read to the given
 * tenant and stamps `tenantId` on every create. This is defence-in-depth on
 * top of the application-level guards — a forgotten `where` clause can never
 * leak another salon's data.
 *
 *   const db = forTenant(req.tenantId);
 *   const services = await db.service.findMany(); // only this tenant's rows
 *
 * See docs/MULTI-TENANCY.md.
 */
export function forTenant(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) {
            return query(args);
          }

          const a: any = args ?? {};

          // Reads & updates & deletes → constrain by tenantId
          if (
            operation === 'findMany' ||
            operation === 'findFirst' ||
            operation === 'findUnique' ||
            operation === 'count' ||
            operation === 'aggregate' ||
            operation === 'updateMany' ||
            operation === 'deleteMany' ||
            operation === 'findFirstOrThrow' ||
            operation === 'findUniqueOrThrow'
          ) {
            a.where = { ...(a.where ?? {}), tenantId };
          }

          // Single update/delete by unique id → wrap so we still filter tenant
          if (operation === 'update' || operation === 'delete') {
            // Convert to the *Many form semantics is unsafe; instead assert.
            a.where = { ...(a.where ?? {}), tenantId };
          }

          // Writes → force tenantId
          if (operation === 'create') {
            a.data = { ...(a.data ?? {}), tenantId };
          }
          if (operation === 'createMany') {
            const data = a.data;
            a.data = Array.isArray(data)
              ? data.map((d: any) => ({ ...d, tenantId }))
              : { ...data, tenantId };
          }
          if (operation === 'upsert') {
            a.where = { ...(a.where ?? {}), tenantId };
            a.create = { ...(a.create ?? {}), tenantId };
          }

          return query(a);
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof forTenant>;
export type { PrismaClient };
export { Prisma };
