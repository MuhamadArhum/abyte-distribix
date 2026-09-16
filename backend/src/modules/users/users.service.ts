import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  /** `page` present -> { data, total, page, limit }. No `page` -> plain array
   * (existing UsersPage caller keeps working unchanged). */
  async findAll(companyId: string, search?: string, page?: number, limit?: number) {
    const where: any = { companyId, ...(search
      ? { OR: [{ fullName: { contains: search } }, { username: { contains: search } }, { email: { contains: search } }] }
      : {}) };
    const select = {
      id: true, username: true, email: true,
      fullName: true, role: true, isActive: true,
      createdAt: true, updatedAt: true,
    };

    if (page === undefined) {
      return this.prisma.user.findMany({ where, select });
    }

    const currentPage = Math.max(page, 1);
    const take = Math.min(Math.max(limit || 20, 1), 200);
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, select, skip: (currentPage - 1) * take, take }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page: currentPage, limit: take };
  }

  async findOne(id: string, companyId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, ...(companyId ? { companyId } : {}) },
      select: {
        id: true, username: true, email: true,
        fullName: true, role: true, isActive: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto, companyId: string, actorUserId?: string) {
    const exists = await this.prisma.user.findFirst({
      where: { companyId, OR: [{ username: dto.username }, { email: dto.email }] },
    });
    if (exists) throw new ConflictException('Username or email already exists');
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { ...dto, companyId, passwordHash, password: undefined } as any,
      select: {
        id: true, username: true, email: true,
        fullName: true, role: true, isActive: true, createdAt: true,
      },
    });
    await this.auditLogsService.log({
      userId: actorUserId, action: 'CREATE', module: 'Users', recordId: user.id,
      newValue: { username: user.username, role: user.role },
    });
    return user;
  }

  /** True if `role`/`isActive` on this user are ADMIN + active right now,
   * and no OTHER active admin exists to fall back on. */
  private async wouldOrphanAdmins(id: string, companyId: string, existingRole: string, existingActive: boolean) {
    if (existingRole !== 'ADMIN' || !existingActive) return false;
    const otherActiveAdmins = await this.prisma.user.count({ where: { companyId, role: 'ADMIN', isActive: true, id: { not: id } } });
    return otherActiveAdmins === 0;
  }

  async update(id: string, dto: UpdateUserDto, companyId: string, actorUserId?: string) {
    const existing = await this.findOne(id, companyId);

    // Self-lockout guard: never let a session deactivate the very account
    // it's using, or there'd be nobody left to undo it.
    if (actorUserId && actorUserId === id && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    // Last-admin guard: block whatever would leave zero active admins,
    // whether that's deactivating this user or demoting them out of ADMIN.
    const losingAdminStatus = dto.isActive === false || (dto.role !== undefined && dto.role !== 'ADMIN');
    if (losingAdminStatus && await this.wouldOrphanAdmins(id, companyId, existing.role, existing.isActive)) {
      throw new BadRequestException('Cannot remove admin access — this is the only active administrator account.');
    }

    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
      delete data.password;
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, fullName: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    await this.auditLogsService.log({
      userId: actorUserId, action: 'UPDATE', module: 'Users', recordId: id,
      previousValue: { role: existing.role, isActive: existing.isActive },
      newValue: { role: updated.role, isActive: updated.isActive },
    });
    return updated;
  }

  async remove(id: string, companyId: string, actorUserId?: string) {
    const existing = await this.findOne(id, companyId);

    if (actorUserId && actorUserId === id) {
      throw new BadRequestException('You cannot delete your own account.');
    }
    if (await this.wouldOrphanAdmins(id, companyId, existing.role, existing.isActive)) {
      throw new BadRequestException('Cannot delete the only active administrator account.');
    }

    const deleted = await this.prisma.user.delete({ where: { id } });
    await this.auditLogsService.log({
      userId: actorUserId, action: 'DELETE', module: 'Users', recordId: id,
      previousValue: { username: existing.username, role: existing.role },
    });
    return deleted;
  }
}
