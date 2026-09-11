import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Maps older/legacy role values (from before the SRS 5-role model) onto their
// closest current equivalent so previously-seeded users keep working.
const LEGACY_ROLE_ALIASES: Record<string, string> = {
  OPERATOR: 'WAREHOUSE',
  VIEWER: 'SALES',
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) throw new ForbiddenException('No role assigned to this user');

    const role = LEGACY_ROLE_ALIASES[user.role] || user.role;

    // Administrator: full system access, always.
    if (role === 'ADMIN') return true;

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException(`Your role (${user.role}) is not permitted to perform this action`);
    }
    return true;
  }
}
