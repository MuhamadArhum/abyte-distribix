import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStorageTankDto } from './dto/create-storage-tank.dto';
import { UpdateStorageTankDto } from './dto/update-storage-tank.dto';

export interface FindAllStorageTanksQuery {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class StorageTanksService {
  constructor(private prisma: PrismaService) {}

  /** `page` present -> { data, total, page, limit } (StorageTanksPage's
   * server-side pagination). No `page` -> plain array, optionally capped by
   * `limit` — this is the pre-existing shape the Dashboard's
   * getAll({ limit: 20 }) call still relies on. */
  async findAll(companyId: string, query?: FindAllStorageTanksQuery) {
    const where: any = { companyId };
    if (query?.search) {
      where.OR = [
        { tankName: { contains: query.search } },
        { tankNumber: { contains: query.search } },
        { location: { contains: query.search } },
      ];
    }
    if (query?.status && query.status !== 'ALL') where.status = query.status;

    if (query?.page === undefined) {
      return this.prisma.storageTank.findMany({
        where, include: { gasProduct: true }, orderBy: { tankName: 'asc' },
        ...(query?.limit ? { take: Number(query.limit) } : {}),
      });
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 20));
    const [data, total] = await Promise.all([
      this.prisma.storageTank.findMany({ where, include: { gasProduct: true }, orderBy: { tankName: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.storageTank.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSummary(companyId: string) {
    const [total, active, capacityAgg, stockAgg] = await Promise.all([
      this.prisma.storageTank.count({ where: { companyId } }),
      this.prisma.storageTank.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.storageTank.aggregate({ where: { companyId }, _sum: { capacity: true } }),
      this.prisma.storageTank.aggregate({ where: { companyId }, _sum: { currentQuantity: true } }),
    ]);
    return {
      total,
      active,
      inactive: total - active,
      totalCapacity: capacityAgg._sum.capacity || 0,
      totalStock: stockAgg._sum.currentQuantity || 0,
    };
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.storageTank.findFirst({ where: { id, companyId }, include: { gasProduct: true } });
    if (!item) throw new NotFoundException(`StorageTank ${id} not found`);
    return item;
  }

  create(dto: CreateStorageTankDto, companyId: string) {
    if ((dto.currentQuantity || 0) > dto.capacity) {
      throw new BadRequestException(`Current quantity (${dto.currentQuantity}) cannot exceed capacity (${dto.capacity}).`);
    }
    return this.prisma.storageTank.create({ data: { ...dto, companyId }, include: { gasProduct: true } });
  }

  async update(id: string, dto: UpdateStorageTankDto, companyId: string) {
    const existing = await this.findOne(id, companyId);
    const newQuantity = dto.currentQuantity !== undefined ? dto.currentQuantity : existing.currentQuantity;
    const newCapacity = dto.capacity !== undefined ? dto.capacity : existing.capacity;
    if (newQuantity > newCapacity) {
      throw new BadRequestException(`Current quantity (${newQuantity}) cannot exceed capacity (${newCapacity}).`);
    }
    if (newQuantity < 0) {
      throw new BadRequestException('Current quantity cannot be negative.');
    }
    return this.prisma.storageTank.update({ where: { id }, data: dto, include: { gasProduct: true } });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.storageTank.delete({ where: { id } });
  }
}
