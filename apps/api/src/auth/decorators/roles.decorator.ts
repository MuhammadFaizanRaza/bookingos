import { SetMetadata } from '@nestjs/common';
import type { Role } from '@bookingos/database';

export const ROLES_KEY = 'roles';

/** Restrict a route/controller to the given roles. Used with RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
