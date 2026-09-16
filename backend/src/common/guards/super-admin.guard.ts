import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

// Separate from RolesGuard on purpose: super-admin sits above every company
// (companyId: null) and isn't part of the per-company ADMIN/MANAGER/... role
// system, so it gets its own boolean check instead of a @Roles() list.
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Super-admin access required');
    }
    return true;
  }
}
