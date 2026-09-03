import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.vehicle.findMany({ orderBy: { vehicleNumber: 'asc' } });
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { deliveries: { include: { customer: true } } },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async create(dto: any) {
    return this.prisma.vehicle.create({ data: dto });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.delete({ where: { id } });
  }
}
