import type { Tenant, Role } from '@salonos/database';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  tenantId: string | null;
  email: string;
  role: Role;
  name: string;
}

export interface RequestWithTenant extends Request {
  tenant?: Tenant;
  tenantId?: string;
  user?: AuthUser;
  rawBody?: Buffer;
}
