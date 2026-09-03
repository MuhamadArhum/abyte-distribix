import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.driver.findMany({ orderBy: { fullName: 'asc' } });
  }

  async findOne(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: { deliveries: { include: { customer: true } } },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async create(dto: any) {
    return this.prisma.driver.create({ data: dto });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.driver.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.driver.delete({ where: { id } });
  }
}
