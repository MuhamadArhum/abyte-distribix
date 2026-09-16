import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    let user;

    if (loginDto.companyId) {
      const company = await this.prisma.company.findUnique({ where: { id: loginDto.companyId } });
      if (!company || company.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid company');
      }
      user = await this.prisma.user.findFirst({
        where: {
          companyId: loginDto.companyId,
          OR: [
            { username: loginDto.username },
            { email: loginDto.username },
          ],
          isActive: true,
        },
      });
    } else {
      // Super-admin login: no company selected.
      user = await this.prisma.user.findFirst({
        where: {
          isSuperAdmin: true,
          OR: [
            { username: loginDto.username },
            { email: loginDto.username },
          ],
          isActive: true,
        },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
      isSuperAdmin: user.isSuperAdmin,
    };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        companyId: user.companyId,
        isSuperAdmin: user.isSuperAdmin,
      },
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  /**
   * Only provisions the default admin when the users table is completely
   * empty (first-run bootstrap). Once any user exists — including a renamed
   * or deleted default admin — this is a no-op, so it can't be used to
   * silently re-provision known credentials on an already-set-up system.
   */
  async seedAdmin() {
    const totalUsers = await this.prisma.user.count();
    if (totalUsers === 0) {
      let company = await this.prisma.company.findFirst();
      if (!company) {
        company = await this.prisma.company.create({
          data: { name: 'Company 1', code: 'company-1', status: 'ACTIVE' },
        });
      }
      const hash = await argon2.hash('admin123');
      await this.prisma.user.create({
        data: {
          companyId: company.id,
          username: 'admin',
          email: 'admin@abyte.com',
          passwordHash: hash,
          fullName: 'System Administrator',
          role: 'ADMIN',
          isActive: true,
        },
      });
      console.log('Admin user seeded: admin / admin123 — change this password immediately.');
      return { seeded: true };
    }
    return { seeded: false };
  }

  /**
   * Only provisions the super-admin account when none exists yet — same
   * one-shot bootstrap guard as seedAdmin(), just keyed on isSuperAdmin
   * instead of total user count, since super-admins live outside every
   * company (companyId: null).
   */
  async seedSuperAdmin() {
    const existing = await this.prisma.user.count({ where: { isSuperAdmin: true } });
    if (existing === 0) {
      const hash = await argon2.hash('superadmin123');
      await this.prisma.user.create({
        data: {
          companyId: null,
          username: 'superadmin',
          email: 'superadmin@abyte.com',
          passwordHash: hash,
          fullName: 'Super Administrator',
          role: 'ADMIN',
          isSuperAdmin: true,
          isActive: true,
        },
      });
      console.log('Super-admin user seeded: superadmin / superadmin123 — change this password immediately.');
      return { seeded: true };
    }
    return { seeded: false };
  }
}
