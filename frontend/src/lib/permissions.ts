// Mirrors the role restrictions enforced by RolesGuard on the backend
// (backend/src/common/guards/roles.guard.ts) so the UI can hide/redirect
// pages the current user isn't allowed to use. The backend is the source
// of truth — this only avoids showing dead-end pages.

export const USER_ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'WAREHOUSE', 'SALES'] as const;

const LEGACY_ROLE_ALIASES: Record<string, string> = {
  OPERATOR: 'WAREHOUSE',
  VIEWER: 'SALES',
};

// Empty/absent array = any authenticated role.
export const ROUTE_ROLES: Record<string, string[]> = {
  '/dashboard': [],
  '/customers': ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES'],
  '/suppliers': ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/gas-products': ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  '/storage-tanks': ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  '/cylinders': ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  '/cylinder-units': ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  '/purchases': ['ADMIN', 'MANAGER'],
  '/gas-receiving': ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  '/filling': ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  '/inventory': ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  '/deliveries': ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  '/drivers': ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  '/vehicles': ['ADMIN', 'MANAGER', 'WAREHOUSE'],
  '/sales': ['ADMIN', 'MANAGER', 'SALES'],
  '/payments/customer': ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES'],
  '/payments/supplier': ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/expenses': ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/accounting': ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/reports': ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES'],
  '/users': ['ADMIN'],
  '/roles': ['ADMIN'],
  '/audit-logs': ['ADMIN'],
  '/backup': ['ADMIN'],
  '/settings': ['ADMIN'],
};

export function normalizeRole(role?: string): string {
  if (!role) return '';
  return LEGACY_ROLE_ALIASES[role] || role;
}

/** Finds the most specific configured route prefix for a given pathname. */
function matchRoute(path: string): string | undefined {
  if (ROUTE_ROLES[path]) return path;
  const candidates = Object.keys(ROUTE_ROLES)
    .filter((p) => path === p || path.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length);
  return candidates[0];
}

export function canAccessPath(role: string | undefined, path: string): boolean {
  const norm = normalizeRole(role);
  if (norm === 'ADMIN') return true;
  const matched = matchRoute(path);
  if (!matched) return true;
  const allowed = ROUTE_ROLES[matched];
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(norm);
}
