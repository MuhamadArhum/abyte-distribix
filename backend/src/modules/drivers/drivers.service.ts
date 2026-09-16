import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  /** `page` present -> { data, total, page, limit }. No `page` -> plain array
   * (existing dropdown callers keep working unchanged). */
  async findAll(companyId: string, search?: string, status?: string, page?: number, limit?: number) {
    const where: any = { companyId };
    if (search) where.OR = [{ fullName: { contains: search } }, { driverCode: { contains: search } }, { phone: { contains: search } }];
    if (status && status !== 'ALL') where.status = status;

    if (page === undefined) {
      return this.prisma.driver.findMany({ where, orderBy: { fullName: 'asc' } });
    }

    const take = Math.min(Math.max(limit || 20, 1), 200);
    const currentPage = Math.max(page, 1);
    const [data, total] = await Promise.all([
      this.prisma.driver.findMany({ where, orderBy: { fullName: 'asc' }, skip: (currentPage - 1) * take, take }),
      this.prisma.driver.count({ where }),
    ]);
    return { data, total, page: currentPage, limit: take };
  }

  async getSummary(companyId: string) {
    const [total, active] = await Promise.all([
      this.prisma.driver.count({ where: { companyId } }),
      this.prisma.driver.count({ where: { companyId, status: 'ACTIVE' } }),
    ]);
    return { total, active, inactive: total - active };
  }

  async findOne(id: string, companyId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, companyId },
      include: { deliveries: { include: { customer: true }, orderBy: { deliveryDate: 'desc' }, take: 50 } },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async create(dto: any, companyId: string) {
    return this.prisma.driver.create({ data: { ...dto, companyId } });
  }

  async update(id: string, dto: any, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.driver.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.driver.delete({ where: { id } });
  }
}
