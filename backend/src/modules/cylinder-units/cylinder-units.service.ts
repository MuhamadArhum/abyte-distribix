import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CylinderUnitsService {
  constructor(private prisma: PrismaService) {}

  findAll(status?: string, cylinderTypeId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (cylinderTypeId) where.cylinderTypeId = cylinderTypeId;
    return this.prisma.cylinderUnit.findMany({
      where,
      include: { cylinderType: true, customer: true },
      orderBy: { serialNumber: 'asc' },
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.cylinderUnit.findUnique({
      where: { id },
      include: { cylinderType: true, customer: true },
    });
    if (!unit) throw new NotFoundException('Cylinder unit not found');
    return unit;
  }

  async findBySerial(serialNumber: string) {
    const unit = await this.prisma.cylinderUnit.findUnique({
      where: { serialNumber },
      include: { cylinderType: true, customer: true },
    });
    if (!unit) throw new NotFoundException('Cylinder unit not found');
    return unit;
  }

  async create(dto: any) {
    const { purchaseDate, ...rest } = dto;
    const qrCode = `CYL-${dto.serialNumber}-${Date.now()}`;
    return this.prisma.cylinderUnit.create({
      data: { ...rest, qrCode, purchaseDate: purchaseDate ? new Date(purchaseDate) : null },
      include: { cylinderType: true, customer: true },
    });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    const { purchaseDate, ...rest } = dto;
    const data: any = { ...rest };
    if (purchaseDate) data.purchaseDate = new Date(purchaseDate);
    return this.prisma.cylinderUnit.update({
      where: { id },
      data,
      include: { cylinderType: true, customer: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.cylinderUnit.delete({ where: { id } });
  }
}
