import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  // Unauthenticated — powers the pre-login company selector. Only ever
  // exposes the fields needed to pick a company, never anything internal.
  async findPublic() {
    return this.prisma.company.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  findAll() {
    return this.prisma.company.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(dto: CreateCompanyDto, actorUserId?: string) {
    const existing = await this.prisma.company.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('A company with this code already exists');

    const company = await this.prisma.company.create({ data: dto });
    await this.auditLogsService.log({
      userId: actorUserId,
      action: 'CREATE',
      module: 'Companies',
      recordId: company.id,
      newValue: company,
    });
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, actorUserId?: string) {
    const previous = await this.findOne(id);
    const company = await this.prisma.company.update({ where: { id }, data: dto });
    await this.auditLogsService.log({
      userId: actorUserId,
      action: 'UPDATE',
      module: 'Companies',
      recordId: company.id,
      previousValue: previous,
      newValue: company,
    });
    return company;
  }
}
