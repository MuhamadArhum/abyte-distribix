import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFillingDto } from './dto/create-filling.dto';
import { UpdateFillingDto } from './dto/update-filling.dto';

@Injectable()
export class FillingService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.fillingBatch.findMany({
      include: { tank: true, cylinderType: true, operator: true },
      orderBy: { fillingDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.fillingBatch.findUnique({
      where: { id },
      include: { tank: true, cylinderType: true, operator: true },
    });
    if (!item) throw new NotFoundException(`FillingBatch ${id} not found`);
    return item;
  }

  create(dto: CreateFillingDto) {
    return this.prisma.fillingBatch.create({
      data: { ...dto, fillingDate: new Date(dto.fillingDate), status: 'PENDING' },
      include: { tank: true, cylinderType: true },
    });
  }

  async update(id: string, dto: UpdateFillingDto) {
    const batch = await this.findOne(id);
    const data: any = { ...dto };
    if (dto.actualGasQty !== undefined) {
      data.gasVariance = dto.actualGasQty - batch.expectedGasQty;
    }
    return this.prisma.fillingBatch.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.fillingBatch.delete({ where: { id } });
  }
}
