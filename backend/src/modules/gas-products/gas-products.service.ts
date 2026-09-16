import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGasProductDto } from './dto/create-gas-product.dto';
import { UpdateGasProductDto } from './dto/update-gas-product.dto';

export interface FindAllGasProductsQuery {
  search?: string;
  gasType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class GasProductsService {
  constructor(private prisma: PrismaService) {}

  /** Plain array when no page/limit is given (existing dropdown callers keep
   * working unchanged); { data, total, page, limit } once paginated. */
  async findAll(companyId: string, query?: FindAllGasProductsQuery) {
    const where: any = { companyId };
    if (query?.search) {
      where.OR = [
        { productName: { contains: query.search } },
        { productCode: { contains: query.search } },
      ];
    }
    if (query?.gasType && query.gasType !== 'ALL') where.gasType = query.gasType;
    if (query?.status && query.status !== 'ALL') where.status = query.status;

    const paginated = query?.page !== undefined || query?.limit !== undefined;
    if (!paginated) {
      return this.prisma.gasProduct.findMany({ where, include: { storageTanks: true }, orderBy: { productName: 'asc' } });
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 50));
    const [data, total] = await Promise.all([
      this.prisma.gasProduct.findMany({ where, include: { storageTanks: true }, orderBy: { productName: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.gasProduct.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSummary(companyId: string) {
    const [total, active, avg] = await Promise.all([
      this.prisma.gasProduct.count({ where: { companyId } }),
      this.prisma.gasProduct.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.gasProduct.aggregate({ where: { companyId }, _avg: { defaultPurchaseRate: true, defaultSellingRate: true } }),
    ]);
    return {
      total,
      active,
      inactive: total - active,
      avgPurchaseRate: avg._avg.defaultPurchaseRate || 0,
      avgSellingRate: avg._avg.defaultSellingRate || 0,
    };
  }

  /** Products whose linked tanks' combined current quantity has dropped
   * below the product's own minStockLevel — minStockLevel was captured on
   * every product but never actually compared against real stock anywhere. */
  async getLowStock(companyId: string) {
    const products = await this.prisma.gasProduct.findMany({
      where: { companyId, minStockLevel: { gt: 0 }, status: 'ACTIVE' },
      include: { storageTanks: { select: { currentQuantity: true } } },
    });
    return products
      .map((p) => ({
        id: p.id,
        productCode: p.productCode,
        productName: p.productName,
        unit: p.unit,
        minStockLevel: p.minStockLevel,
        currentStock: p.storageTanks.reduce((s, t) => s + t.currentQuantity, 0),
      }))
      .filter((p) => p.currentStock < p.minStockLevel);
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.gasProduct.findFirst({ where: { id, companyId }, include: { storageTanks: true } });
    if (!item) throw new NotFoundException(`GasProduct ${id} not found`);
    return item;
  }

  create(dto: CreateGasProductDto, companyId: string) { return this.prisma.gasProduct.create({ data: { ...dto, companyId } }); }

  async update(id: string, dto: UpdateGasProductDto, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.gasProduct.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.gasProduct.delete({ where: { id } });
  }
}
