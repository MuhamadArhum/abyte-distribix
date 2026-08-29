import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCylinderTypeDto } from './dto/create-cylinder.dto';
import { UpdateCylinderTypeDto } from './dto/update-cylinder.dto';

@Injectable()
export class CylindersService {
  constructor(private prisma: PrismaService) {}

  findAllTypes() {
    return this.prisma.cylinderType.findMany({
      include: { cylinderInventory: true },
    });
  }

  async findOneType(id: string) {
    const item = await this.prisma.cylinderType.findUnique({
      where: { id },
      include: { cylinderInventory: true, saleItems: { take: 10 } },
    });
    if (!item) throw new NotFoundException(`CylinderType ${id} not found`);
    return item;
  }

  createType(dto: CreateCylinderTypeDto) {
    return this.prisma.cylinderType.create({ data: dto, include: { cylinderInventory: true } });
  }

  async updateType(id: string, dto: UpdateCylinderTypeDto) {
    await this.findOneType(id);
    return this.prisma.cylinderType.update({ where: { id }, data: dto });
  }

  async removeType(id: string) {
    await this.findOneType(id);
    return this.prisma.cylinderType.delete({ where: { id } });
  }

  getInventory() {
    return this.prisma.cylinderInventory.findMany({ include: { cylinderType: true } });
  }

  getTransactions() {
    return this.prisma.cylinderTransaction.findMany({
      include: { cylinderType: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
