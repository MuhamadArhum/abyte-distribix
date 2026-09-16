import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(companyId: string, search?: string, page?: number, limit?: number) {
    const where: any = { companyId, ...(search
      ? { OR: [{ name: { contains: search } }, { description: { contains: search } }] }
      : {}) };

    const currentPage = Math.max(page || 1, 1);
    const take = Math.min(Math.max(limit || 20, 1), 200);
    const [data, total] = await Promise.all([
      this.prisma.role.findMany({ where, orderBy: { name: 'asc' }, skip: (currentPage - 1) * take, take }),
      this.prisma.role.count({ where }),
    ]);
    return { data, total, page: currentPage, limit: take };
  }

  async findOne(id: string, companyId: string) {
    const role = await this.prisma.role.findFirst({ where: { id, companyId } });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  async create(data: { name: string; description?: string; permissions?: string }, companyId: string, actorUserId?: string) {
    const role = await this.prisma.role.create({ data: { name: data.name, description: data.description, permissions: data.permissions || '[]', companyId } });
    await this.auditLogsService.log({ userId: actorUserId, action: 'CREATE', module: 'Roles', recordId: role.id, newValue: { name: role.name, permissions: role.permissions } });
    return role;
  }

  async update(id: string, data: any, companyId: string, actorUserId?: string) {
    const existing = await this.findOne(id, companyId);
    const updated = await this.prisma.role.update({ where: { id }, data });
    await this.auditLogsService.log({ userId: actorUserId, action: 'UPDATE', module: 'Roles', recordId: id, previousValue: { permissions: existing.permissions }, newValue: { permissions: updated.permissions } });
    return updated;
  }

  async remove(id: string, companyId: string, actorUserId?: string) {
    const existing = await this.findOne(id, companyId);
    const deleted = await this.prisma.role.delete({ where: { id } });
    await this.auditLogsService.log({ userId: actorUserId, action: 'DELETE', module: 'Roles', recordId: id, previousValue: { name: existing.name } });
    return deleted;
  }
}
