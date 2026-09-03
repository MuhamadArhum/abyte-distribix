import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.delivery.findMany({
      include: { customer: true, driver: true, vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: { customer: true, driver: true, vehicle: true },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  async create(dto: any) {
    const { deliveryDate, ...rest } = dto;
    return this.prisma.delivery.create({
      data: { ...rest, deliveryDate: new Date(deliveryDate) },
      include: { customer: true, driver: true, vehicle: true },
    });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const { deliveryDate, ...rest } = dto;
    const data: any = { ...rest };
    if (deliveryDate) data.deliveryDate = new Date(deliveryDate);
    return this.prisma.delivery.update({
      where: { id },
      data,
      include: { customer: true, driver: true, vehicle: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.delivery.delete({ where: { id } });
  }
}
