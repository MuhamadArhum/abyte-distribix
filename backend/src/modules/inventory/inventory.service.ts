import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getGasStock() {
    return this.prisma.storageTank.findMany({
      include: { gasProduct: true },
      orderBy: { tankNumber: 'asc' },
    });
  }

  async getCylinderStock() {
    return this.prisma.cylinderInventory.findMany({
      include: { cylinderType: true },
      orderBy: { cylinderTypeId: 'asc' },
    });
  }

  async getTransactions(tankId?: string) {
    return this.prisma.gasInventoryTransaction.findMany({
      where: tankId ? { tankId } : undefined,
      include: { tank: true, gasProduct: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createAdjustment(data: { tankId: string; quantity: number; notes?: string; createdById?: string }) {
    const tank = await this.prisma.storageTank.findUnique({ where: { id: data.tankId } });
    if (!tank) throw new Error('Tank not found');
    const newStock = tank.currentQuantity + data.quantity;
    await this.prisma.storageTank.update({ where: { id: data.tankId }, data: { currentQuantity: newStock } });
    return this.prisma.gasInventoryTransaction.create({
      data: {
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
  }
}
