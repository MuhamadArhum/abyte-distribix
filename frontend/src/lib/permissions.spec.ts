import { describe, it, expect } from 'vitest';
import { canAccessPath, normalizeRole } from './permissions';

describe('normalizeRole', () => {
  it('maps legacy OPERATOR to WAREHOUSE', () => {
    expect(normalizeRole('OPERATOR')).toBe('WAREHOUSE');
  });

  it('maps legacy VIEWER to SALES', () => {
    expect(normalizeRole('VIEWER')).toBe('SALES');
  });

  it('passes canonical roles through unchanged', () => {
    expect(normalizeRole('ADMIN')).toBe('ADMIN');
    expect(normalizeRole('ACCOUNTANT')).toBe('ACCOUNTANT');
  });

  it('returns an empty string for an undefined role', () => {
    expect(normalizeRole(undefined)).toBe('');
  });
});

describe('canAccessPath', () => {
  it('lets ADMIN reach every configured route', () => {
    expect(canAccessPath('ADMIN', '/users')).toBe(true);
    expect(canAccessPath('ADMIN', '/backup')).toBe(true);
    expect(canAccessPath('ADMIN', '/settings')).toBe(true);
  });

  it('blocks SALES from admin-only pages', () => {
    expect(canAccessPath('SALES', '/users')).toBe(false);
    expect(canAccessPath('SALES', '/settings')).toBe(false);
  });

  it('lets SALES reach its own operational pages', () => {
    expect(canAccessPath('SALES', '/sales')).toBe(true);
    expect(canAccessPath('SALES', '/customers')).toBe(true);
    expect(canAccessPath('SALES', '/payments/customer')).toBe(true);
  });

  it('blocks SALES from supplier payments (accountant/manager territory)', () => {
    expect(canAccessPath('SALES', '/payments/supplier')).toBe(false);
  });

  it('lets WAREHOUSE reach warehouse operations but not finance pages', () => {
    expect(canAccessPath('WAREHOUSE', '/filling')).toBe(true);
    expect(canAccessPath('WAREHOUSE', '/cylinders')).toBe(true);
    expect(canAccessPath('WAREHOUSE', '/accounting')).toBe(false);
  });

  it('allows any authenticated role on unrestricted routes like the dashboard', () => {
    expect(canAccessPath('SALES', '/dashboard')).toBe(true);
    expect(canAccessPath('WAREHOUSE', '/dashboard')).toBe(true);
  });

  it('matches nested paths against their configured prefix', () => {
    expect(canAccessPath('SALES', '/customers/abc123')).toBe(true);
    expect(canAccessPath('SALES', '/purchases/new')).toBe(false);
  });

  it('applies legacy role aliases before checking access', () => {
    expect(canAccessPath('OPERATOR', '/filling')).toBe(true);
    expect(canAccessPath('VIEWER', '/sales')).toBe(true);
  });
});
