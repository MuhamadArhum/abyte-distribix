import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findFirst: jest.Mock } };
  let jwt: { sign: jest.Mock };

  const activeUser = {
    id: 'u1', username: 'admin', email: 'admin@abyte.com',
    passwordHash: 'hashed', fullName: 'Admin User', role: 'ADMIN', isActive: true,
  };

  beforeEach(() => {
    prisma = { user: { findFirst: jest.fn() } };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    service = new AuthService(prisma as unknown as PrismaService, jwt as unknown as JwtService);
    jest.clearAllMocks();
  });

  it('issues a token for valid credentials', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    (argon2.verify as jest.Mock).mockResolvedValue(true);

    const result = await service.login({ username: 'admin', password: 'admin123' });

    expect(result.access_token).toBe('signed.jwt.token');
    expect(result.user).toEqual({
      id: 'u1', username: 'admin', email: 'admin@abyte.com', fullName: 'Admin User', role: 'ADMIN',
    });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1', username: 'admin', role: 'ADMIN' });
  });

  it('rejects an unknown username', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.login({ username: 'ghost', password: 'x' })).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a wrong password without issuing a token', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    (argon2.verify as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ username: 'admin', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('only ever looks up active users', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.login({ username: 'admin', password: 'x' })).rejects.toThrow(UnauthorizedException);
    const whereArg = prisma.user.findFirst.mock.calls[0][0].where;
    expect(whereArg.isActive).toBe(true);
  });
});
