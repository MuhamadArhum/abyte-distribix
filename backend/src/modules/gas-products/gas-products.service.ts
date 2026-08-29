import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGasProductDto } from './dto/create-gas-product.dto';
import { UpdateGasProductDto } from './dto/update-gas-product.dto';

@Injectable()
export class GasProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() { return this.prisma.gasProduct.findMany({ include: { storageTanks: true } }); }

  async findOne(id: string) {
    const item = await this.prisma.gasProduct.findUnique({ where: { id }, include: { storageTanks: true } });
    if (!item) throw new NotFoundException(`GasProduct ${id} not found`);
    return item;
  }

  create(dto: CreateGasProductDto) { return this.prisma.gasProduct.create({ data: dto }); }

  async update(id: string, dto: UpdateGasProductDto) {
    await this.findOne(id);
    return this.prisma.gasProduct.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.gasProduct.delete({ where: { id } });
  }
}
