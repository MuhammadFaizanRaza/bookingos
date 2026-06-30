import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import type { RequestWithTenant } from '../common/types';

/**
 * Resolves the active tenant for every request that reaches a tenant-scoped
 * route. Resolution order:
 *   1. `x-tenant-slug` header   (used by the web/admin app & API clients)
 *   2. `<slug>.ROOT_DOMAIN` subdomain  (used by white-label booking sites)
 *   3. `?tenant=` query param   (dev convenience)
 *
 * The resolved Tenant + tenantId are attached to the request. If no tenant can
 * be resolved here we simply continue — guards on protected routes still run,
 * and platform/auth routes don't need a tenant. Routes that require a tenant
 * use `@CurrentTenant()` which throws if it is absent.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly reserved: Set<string>;
  private readonly rootDomain: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.rootDomain = (config.get<string>('ROOT_DOMAIN') ?? '').toLowerCase();
    this.reserved = new Set(
      (config.get<string>('RESERVED_SUBDOMAINS') ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  async use(
    req: RequestWithTenant,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const slug = this.resolveSlug(req);
    if (!slug) {
      return next();
    }

    const tenant = await this.prisma.client.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException(`Unknown salon "${slug}"`);
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;
    next();
  }

  private resolveSlug(req: RequestWithTenant): string | null {
    const header = req.headers['x-tenant-slug'];
    if (typeof header === 'string' && header.trim()) {
      return header.trim().toLowerCase();
    }

    const queryTenant = req.query?.tenant;
    if (typeof queryTenant === 'string' && queryTenant.trim()) {
      return queryTenant.trim().toLowerCase();
    }

    const host = (req.headers.host ?? '').split(':')[0].toLowerCase();
    if (host && this.rootDomain && host.endsWith(`.${this.rootDomain}`)) {
      const sub = host.slice(0, -(this.rootDomain.length + 1));
      const first = sub.split('.')[0];
      if (first && !this.reserved.has(first)) {
        return first;
      }
    }

    return null;
  }
}
