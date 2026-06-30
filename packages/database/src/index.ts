import { PrismaClient } from '@prisma/client';

// Re-export all Prisma types & enums so apps import from one place:
//   import { Role, AppointmentStatus, type Tenant } from '@bookingos/database';
export * from '@prisma/client';

// Singleton — avoids exhausting DB connections during dev hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { forTenant } from './tenant';
export type { TenantClient } from './tenant';
