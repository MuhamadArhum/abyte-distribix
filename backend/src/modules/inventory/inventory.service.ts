import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getGasStock(companyId: string, search?: string, page = 1, limit = 20) {
    const where: any = { companyId };
    if (search) where.tankName = { contains: search };

    const take = Math.min(Math.max(limit, 1), 200);
    const currentPage = Math.max(page, 1);
    const [data, total] = await Promise.all([
      this.prisma.storageTank.findMany({
        where, include: { gasProduct: true }, orderBy: { tankNumber: 'asc' },
        skip: (currentPage - 1) * take, take,
      }),
      this.prisma.storageTank.count({ where }),
    ]);
    return { data, total, page: currentPage, limit: take };
  }

  async getCylinderStock(companyId: string, search?: string, page = 1, limit = 20) {
    const where: any = { companyId };
    if (search) where.cylinderType = { cylinderSize: { contains: search } };

    const take = Math.min(Math.max(limit, 1), 200);
    const currentPage = Math.max(page, 1);
    const [data, total] = await Promise.all([
      this.prisma.cylinderInventory.findMany({
        where, include: { cylinderType: true }, orderBy: { cylinderTypeId: 'asc' },
        skip: (currentPage - 1) * take, take,
      }),
      this.prisma.cylinderInventory.count({ where }),
    ]);
    return { data, total, page: currentPage, limit: take };
  }

  async getTransactions(companyId: string, tankId?: string) {
    return this.prisma.gasInventoryTransaction.findMany({
      where: { companyId, ...(tankId ? { tankId } : {}) },
      include: { tank: true, gasProduct: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createAdjustment(data: { tankId: string; quantity: number; notes?: string; createdById?: string }, companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const tank = await tx.storageTank.findFirst({ where: { id: data.tankId, companyId } });
      if (!tank) throw new NotFoundException(`StorageTank ${data.tankId} not found`);

      const newStock = tank.currentQuantity + data.quantity;
      if (newStock < 0) {
        throw new BadRequestException(`Adjustment would take ${tank.tankName} below zero stock.`);
      }
      if (newStock > tank.capacity) {
        throw new BadRequestException(
          `Adjustment would exceed ${tank.tankName}'s capacity (${tank.currentQuantity}/${tank.capacity} KG currently).`,
        );
      }

      await tx.storageTank.update({ where: { id: data.tankId }, data: { currentQuantity: newStock } });
      return tx.gasInventoryTransaction.create({
        data: {
          companyId,
          transactionType: 'ADJUSTMENT',
          tankId: data.tankId,
          gasProductId: tank.gasProductId,
          quantity: data.quantity,
          previousStock: tank.currentQuantity,
          newStock,
          notes: data.notes,
          createdById: data.createdById,
        },
      });
    });
  }
}
