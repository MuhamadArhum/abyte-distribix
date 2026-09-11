import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restricts a controller/handler to the given roles.
 * ADMIN always passes (enforced in RolesGuard) regardless of what's listed here.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
