import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCylinderTypeDto } from './dto/create-cylinder.dto';
import { UpdateCylinderTypeDto } from './dto/update-cylinder.dto';

export interface FindAllCylinderTypesQuery {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CylindersService {
  constructor(private prisma: PrismaService) {}

  /** `page` present -> { data, total, page, limit } (CylindersPage's
   * server-side pagination). No `page` -> plain array, optionally capped by
   * `limit` — the shape Dashboard/NewSale/NewFilling/CylinderUnits dropdown
   * callers already rely on. */
  async findAllTypes(companyId: string, query?: FindAllCylinderTypesQuery) {
    const where: any = { companyId };
    if (query?.search) where.cylinderSize = { contains: query.search };
    if (query?.status && query.status !== 'ALL') where.status = query.status;

    if (query?.page === undefined) {
      return this.prisma.cylinderType.findMany({
        where, include: { cylinderInventory: true }, orderBy: { cylinderSize: 'asc' },
        ...(query?.limit ? { take: Number(query.limit) } : {}),
      });
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 20));
    const [data, total] = await Promise.all([
      this.prisma.cylinderType.findMany({ where, include: { cylinderInventory: true }, orderBy: { cylinderSize: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.cylinderType.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSummary(companyId: string) {
    const [total, active, types] = await Promise.all([
      this.prisma.cylinderType.count({ where: { companyId } }),
      this.prisma.cylinderType.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.cylinderType.findMany({
        where: { companyId },
        select: { depositAmount: true, cylinderInventory: { select: { status: true, quantity: true } } },
      }),
    ]);

    let totalFilled = 0;
    let totalEmpty = 0;
    let totalDeposit = 0;
    for (const t of types) {
      let typeTotal = 0;
      for (const inv of t.cylinderInventory) {
        if (inv.status === 'FILLED') { totalFilled += inv.quantity; typeTotal += inv.quantity; }
        else if (inv.status === 'EMPTY') { totalEmpty += inv.quantity; typeTotal += inv.quantity; }
      }
      totalDeposit += t.depositAmount * typeTotal;
    }

    return { total, active, inactive: total - active, totalFilled, totalEmpty, totalDeposit };
  }

  async findOneType(id: string, companyId: string) {
    const item = await this.prisma.cylinderType.findFirst({
      where: { id, companyId },
      include: { cylinderInventory: true, saleItems: { take: 10 } },
    });
    if (!item) throw new NotFoundException(`CylinderType ${id} not found`);
    return item;
  }

  createType(dto: CreateCylinderTypeDto, companyId: string) {
    return this.prisma.cylinderType.create({ data: { ...dto, companyId }, include: { cylinderInventory: true } });
  }

  async updateType(id: string, dto: UpdateCylinderTypeDto, companyId: string) {
    await this.findOneType(id, companyId);
    return this.prisma.cylinderType.update({ where: { id }, data: dto });
  }

  async removeType(id: string, companyId: string) {
    await this.findOneType(id, companyId);
    return this.prisma.cylinderType.delete({ where: { id } });
  }

  getInventory(companyId: string) {
    return this.prisma.cylinderInventory.findMany({ where: { companyId }, include: { cylinderType: true } });
  }

  getTransactions(companyId: string) {
    return this.prisma.cylinderTransaction.findMany({
      where: { companyId },
      include: { cylinderType: true, customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
