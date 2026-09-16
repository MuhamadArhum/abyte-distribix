import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFillingDto } from './dto/create-filling.dto';
import { UpdateFillingDto } from './dto/update-filling.dto';

export interface FindAllFillingQuery {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class FillingService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, query?: FindAllFillingQuery) {
    const where: any = { companyId };
    if (query?.search) {
      const q = query.search;
      where.OR = [
        { batchNumber: { contains: q } },
        { cylinderType: { cylinderSize: { contains: q } } },
        { tank: { tankName: { contains: q } } },
      ];
    }
    if (query?.status && query.status !== 'ALL') where.status = query.status;
    if (query?.from || query?.to) {
      where.fillingDate = {};
      if (query.from) where.fillingDate.gte = new Date(query.from);
      if (query.to) { const end = new Date(query.to); end.setDate(end.getDate() + 1); where.fillingDate.lt = end; }
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 20));
    const [data, total] = await Promise.all([
      this.prisma.fillingBatch.findMany({ where, include: { tank: true, cylinderType: true, operator: true }, orderBy: { fillingDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.fillingBatch.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSummary(companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayAgg, monthAgg, gasUsedAgg, inProgressCount] = await Promise.all([
      this.prisma.fillingBatch.aggregate({ where: { companyId, fillingDate: { gte: today, lt: tomorrow } }, _sum: { numberOfCylinders: true }, _count: true }),
      this.prisma.fillingBatch.aggregate({ where: { companyId, fillingDate: { gte: monthStart, lt: tomorrow } }, _sum: { numberOfCylinders: true } }),
      this.prisma.fillingBatch.aggregate({ where: { companyId, status: 'COMPLETED' }, _sum: { actualGasQty: true } }),
      this.prisma.fillingBatch.count({ where: { companyId, status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
    ]);

    return {
      todayCount: todayAgg._count,
      todayCylinders: todayAgg._sum.numberOfCylinders || 0,
      monthCylinders: monthAgg._sum.numberOfCylinders || 0,
      totalGasUsed: gasUsedAgg._sum.actualGasQty || 0,
      inProgressCount,
    };
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.fillingBatch.findFirst({
      where: { id, companyId },
      include: { tank: true, cylinderType: true, operator: true },
    });
    if (!item) throw new NotFoundException(`FillingBatch ${id} not found`);
    return item;
  }

  create(dto: CreateFillingDto, companyId: string) {
    return this.prisma.fillingBatch.create({
      data: { ...dto, companyId, fillingDate: new Date(dto.fillingDate), status: 'PENDING' },
      include: { tank: true, cylinderType: true },
    });
  }

  async update(id: string, dto: UpdateFillingDto, companyId: string) {
    const batch = await this.findOne(id, companyId);
    const data: any = { ...dto };
    if (dto.actualGasQty !== undefined) {
      data.gasVariance = dto.actualGasQty - batch.expectedGasQty;
    }

    const wasCompleted = batch.status === 'COMPLETED';
    const willBeCompleted = dto.status === 'COMPLETED';
    const willBeCancelled = dto.status === 'CANCELLED';

    return this.prisma.$transaction(async (tx) => {
      // Completing a batch is the moment raw tank gas actually becomes
      // filled cylinders — apply the real inventory movement exactly once.
      if (!wasCompleted && willBeCompleted) {
        const actualGasQty = dto.actualGasQty ?? batch.actualGasQty ?? batch.expectedGasQty;

        const tank = await tx.storageTank.findUnique({ where: { id: batch.tankId } });
        if (!tank) throw new NotFoundException(`StorageTank ${batch.tankId} not found`);
        if (tank.currentQuantity < actualGasQty) {
          throw new BadRequestException(
            `Insufficient gas in tank ${tank.tankName}: have ${tank.currentQuantity} KG, batch needs ${actualGasQty} KG`,
          );
        }

        const emptyInv = await tx.cylinderInventory.findUnique({
          where: { cylinderTypeId_status: { cylinderTypeId: batch.cylinderTypeId, status: 'EMPTY' } },
        });
        const emptyAvailable = emptyInv?.quantity || 0;
        if (emptyAvailable < batch.numberOfCylinders) {
          throw new BadRequestException(
            `Insufficient empty cylinders: have ${emptyAvailable}, batch needs ${batch.numberOfCylinders}`,
          );
        }

        const newTankQty = tank.currentQuantity - actualGasQty;
        await tx.storageTank.update({ where: { id: batch.tankId }, data: { currentQuantity: newTankQty } });
        await tx.gasInventoryTransaction.create({
          data: {
            companyId,
            transactionType: 'FILLING',
            referenceId: id,
            referenceType: 'FillingBatch',
            tankId: batch.tankId,
            gasProductId: tank.gasProductId,
            quantity: -actualGasQty,
            previousStock: tank.currentQuantity,
            newStock: newTankQty,
            notes: `Filling batch ${batch.batchNumber}`,
          },
        });

        await tx.cylinderInventory.update({
          where: { cylinderTypeId_status: { cylinderTypeId: batch.cylinderTypeId, status: 'EMPTY' } },
          data: { quantity: { decrement: batch.numberOfCylinders } },
        });
        await tx.cylinderInventory.upsert({
          where: { cylinderTypeId_status: { cylinderTypeId: batch.cylinderTypeId, status: 'FILLED' } },
          update: { quantity: { increment: batch.numberOfCylinders } },
          create: { companyId, cylinderTypeId: batch.cylinderTypeId, status: 'FILLED', quantity: batch.numberOfCylinders },
        });
        await tx.cylinderTransaction.create({
          data: {
            companyId,
            transactionType: 'FILLING',
            referenceId: id,
            cylinderTypeId: batch.cylinderTypeId,
            quantity: batch.numberOfCylinders,
            fromStatus: 'EMPTY',
            toStatus: 'FILLED',
            notes: `Filling batch ${batch.batchNumber}`,
          },
        });
      } else if (wasCompleted && willBeCancelled) {
        // Reverse a previously-completed batch that's now being cancelled.
        const actualGasQty = batch.actualGasQty || batch.expectedGasQty;
        const tank = await tx.storageTank.findUnique({ where: { id: batch.tankId } });
        if (tank) {
          const newTankQty = tank.currentQuantity + actualGasQty;
          await tx.storageTank.update({ where: { id: batch.tankId }, data: { currentQuantity: newTankQty } });
          await tx.gasInventoryTransaction.create({
            data: {
              companyId,
              transactionType: 'FILLING_REVERSED',
              referenceId: id,
              referenceType: 'FillingBatch',
              tankId: batch.tankId,
              gasProductId: tank.gasProductId,
              quantity: actualGasQty,
              previousStock: tank.currentQuantity,
              newStock: newTankQty,
              notes: `Filling batch ${batch.batchNumber} cancelled after completion`,
            },
          });
        }
        await tx.cylinderInventory.update({
          where: { cylinderTypeId_status: { cylinderTypeId: batch.cylinderTypeId, status: 'FILLED' } },
          data: { quantity: { decrement: batch.numberOfCylinders } },
        }).catch(() => undefined);
        await tx.cylinderInventory.upsert({
          where: { cylinderTypeId_status: { cylinderTypeId: batch.cylinderTypeId, status: 'EMPTY' } },
          update: { quantity: { increment: batch.numberOfCylinders } },
          create: { companyId, cylinderTypeId: batch.cylinderTypeId, status: 'EMPTY', quantity: batch.numberOfCylinders },
        });
        await tx.cylinderTransaction.create({
          data: {
            companyId,
            transactionType: 'FILLING_REVERSED',
            referenceId: id,
            cylinderTypeId: batch.cylinderTypeId,
            quantity: batch.numberOfCylinders,
            fromStatus: 'FILLED',
            toStatus: 'EMPTY',
            notes: `Filling batch ${batch.batchNumber} cancelled after completion`,
          },
        });
      }

      return tx.fillingBatch.update({ where: { id }, data });
    });
  }

  async remove(id: string, companyId: string) {
    const batch = await this.findOne(id, companyId);
    if (batch.status === 'COMPLETED') {
      throw new BadRequestException(
        `Cannot delete a completed filling batch (${batch.batchNumber}) — it already moved real gas/cylinder stock. Cancel it first instead.`,
      );
    }
    return this.prisma.fillingBatch.delete({ where: { id } });
  }
}
