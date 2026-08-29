import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStorageTankDto } from './dto/create-storage-tank.dto';
import { UpdateStorageTankDto } from './dto/update-storage-tank.dto';

@Injectable()
export class StorageTanksService {
  constructor(private prisma: PrismaService) {}

  findAll() { return this.prisma.storageTank.findMany({ include: { gasProduct: true } }); }

  async findOne(id: string) {
    const item = await this.prisma.storageTank.findUnique({ where: { id }, include: { gasProduct: true } });
    if (!item) throw new NotFoundException(`StorageTank ${id} not found`);
    return item;
  }

  create(dto: CreateStorageTankDto) { return this.prisma.storageTank.create({ data: dto, include: { gasProduct: true } }); }

  async update(id: string, dto: UpdateStorageTankDto) {
    await this.findOne(id);
    return this.prisma.storageTank.update({ where: { id }, data: dto, include: { gasProduct: true } });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.storageTank.delete({ where: { id } });
  }
}
