import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  findAll(module?: string, userId?: string) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(module ? { module } : {}),
        ...(userId ? { userId } : {}),
      },
      include: { user: { select: { id: true, fullName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  findOne(id: string) {
    return this.prisma.auditLog.findUnique({ where: { id }, include: { user: true } });
  }

  log(data: {
    userId?: string;
    action: string;
    module: string;
    recordId?: string;
    previousValue?: any;
    newValue?: any;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...data,
        previousValue: data.previousValue ? JSON.stringify(data.previousValue) : undefined,
        newValue: data.newValue ? JSON.stringify(data.newValue) : undefined,
      },
    });
  }
}
