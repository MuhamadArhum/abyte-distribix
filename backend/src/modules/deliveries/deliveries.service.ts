import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface FindAllDeliveriesQuery {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class DeliveriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, query?: FindAllDeliveriesQuery) {
    const where: any = { companyId };
    if (query?.search) {
      const q = query.search;
      where.OR = [
        { deliveryNumber: { contains: q } },
        { customer: { businessName: { contains: q } } },
      ];
    }
    if (query?.status && query.status !== 'ALL') where.status = query.status;

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 20));
    const [data, total] = await Promise.all([
      this.prisma.delivery.findMany({ where, include: { customer: true, driver: true, vehicle: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.delivery.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSummary(companyId: string) {
    const [total, byStatus] = await Promise.all([
      this.prisma.delivery.count({ where: { companyId } }),
      this.prisma.delivery.groupBy({ by: ['status'], where: { companyId }, _count: true }),
    ]);
    const counts: Record<string, number> = {};
    for (const row of byStatus) counts[row.status] = row._count;
    return { total, byStatus: counts };
  }

  async findOne(id: string, companyId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, companyId },
      include: { customer: true, driver: true, vehicle: true },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  async create(dto: any, companyId: string) {
    const { deliveryDate, ...rest } = dto;
    return this.prisma.delivery.create({
      data: { ...rest, companyId, deliveryDate: new Date(deliveryDate) },
      include: { customer: true, driver: true, vehicle: true },
    });
  }

  async update(id: string, dto: any, companyId: string) {
    await this.findOne(id, companyId);
    const { deliveryDate, ...rest } = dto;
    const data: any = { ...rest };
    if (deliveryDate) data.deliveryDate = new Date(deliveryDate);
    return this.prisma.delivery.update({
      where: { id },
      data,
      include: { customer: true, driver: true, vehicle: true },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.delivery.delete({ where: { id } });
  }
}
