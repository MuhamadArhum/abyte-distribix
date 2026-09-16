import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  /** `page` present -> { data, total, page, limit }. No `page` -> plain array
   * (existing dropdown callers keep working unchanged). */
  async findAll(companyId: string, search?: string, status?: string, page?: number, limit?: number) {
    const where: any = { companyId };
    if (search) where.OR = [{ vehicleNumber: { contains: search } }, { vehicleCode: { contains: search } }, { vehicleType: { contains: search } }];
    if (status && status !== 'ALL') where.status = status;

    if (page === undefined) {
      return this.prisma.vehicle.findMany({ where, orderBy: { vehicleNumber: 'asc' } });
    }

    const take = Math.min(Math.max(limit || 20, 1), 200);
    const currentPage = Math.max(page, 1);
    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({ where, orderBy: { vehicleNumber: 'asc' }, skip: (currentPage - 1) * take, take }),
      this.prisma.vehicle.count({ where }),
    ]);
    return { data, total, page: currentPage, limit: take };
  }

  async getSummary(companyId: string) {
    const [total, active, maintenance] = await Promise.all([
      this.prisma.vehicle.count({ where: { companyId } }),
      this.prisma.vehicle.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.vehicle.count({ where: { companyId, status: 'MAINTENANCE' } }),
    ]);
    return { total, active, maintenance, inactive: total - active - maintenance };
  }

  async findOne(id: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
      include: { deliveries: { include: { customer: true }, orderBy: { deliveryDate: 'desc' }, take: 50 } },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async create(dto: any, companyId: string) {
    return this.prisma.vehicle.create({ data: { ...dto, companyId } });
  }

  async update(id: string, dto: any, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.vehicle.delete({ where: { id } });
  }
}
