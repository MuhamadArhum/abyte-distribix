import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, module?: string, userId?: string, page = 1, limit = 200) {
    const where = {
      companyId,
      ...(module ? { module } : {}),
      ...(userId ? { userId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  findOne(id: string, companyId: string) {
    return this.prisma.auditLog.findFirst({ where: { id, companyId }, include: { user: true } });
  }

  /** Distinct module names across ALL logs — the module filter dropdown
   * needs this, not just whatever happens to appear on the current page. */
  async getModules(companyId: string) {
    const rows = await this.prisma.auditLog.findMany({ where: { companyId }, distinct: ['module'], select: { module: true }, orderBy: { module: 'asc' } });
    return rows.map((r) => r.module);
  }

  /** companyId is resolved from the acting user rather than threaded through
   * every one of this method's ~24 call sites — a super-admin actor (whose
   * own companyId is null) naturally produces a null (system-level) log row. */
  async log(data: {
    userId?: string;
    action: string;
    module: string;
    recordId?: string;
    previousValue?: any;
    newValue?: any;
    ipAddress?: string;
  }) {
    const actor = data.userId ? await this.prisma.user.findUnique({ where: { id: data.userId }, select: { companyId: true } }) : null;
    return this.prisma.auditLog.create({
      data: {
        ...data,
        companyId: actor?.companyId ?? null,
        previousValue: data.previousValue ? JSON.stringify(data.previousValue) : undefined,
        newValue: data.newValue ? JSON.stringify(data.newValue) : undefined,
      },
    });
  }
}
