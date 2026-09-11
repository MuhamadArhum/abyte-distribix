import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function mockContext(user: any, handler = () => {}, cls = class {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => cls,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows the request when no @Roles metadata is present', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: 'SALES' }))).toBe(true);
  });

  it('always allows ADMIN, regardless of the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ACCOUNTANT']);
    expect(guard.canActivate(mockContext({ role: 'ADMIN' }))).toBe(true);
  });

  it('allows a role explicitly listed in @Roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['MANAGER', 'WAREHOUSE']);
    expect(guard.canActivate(mockContext({ role: 'WAREHOUSE' }))).toBe(true);
  });

  it('rejects a role not listed in @Roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'MANAGER']);
    expect(() => guard.canActivate(mockContext({ role: 'SALES' }))).toThrow(ForbiddenException);
  });

  it('maps the legacy OPERATOR role onto WAREHOUSE', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['WAREHOUSE']);
    expect(guard.canActivate(mockContext({ role: 'OPERATOR' }))).toBe(true);
  });

  it('maps the legacy VIEWER role onto SALES', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ACCOUNTANT']);
    expect(() => guard.canActivate(mockContext({ role: 'VIEWER' }))).toThrow(ForbiddenException);
  });

  it('rejects a request with no authenticated user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(ForbiddenException);
  });
});
