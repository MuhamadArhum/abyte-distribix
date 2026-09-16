import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGasReceivingDto } from './dto/create-gas-receiving.dto';
import { UpdateGasReceivingDto } from './dto/update-gas-receiving.dto';

export interface FindAllGasReceivingQuery {
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class GasReceivingService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, query?: FindAllGasReceivingQuery) {
    const where: any = { companyId };
    if (query?.search) {
      const q = query.search;
      where.OR = [
        { receivingNumber: { contains: q } },
        { supplier: { supplierName: { contains: q } } },
        { tank: { tankName: { contains: q } } },
      ];
    }
    if (query?.from || query?.to) {
      where.receivingDate = {};
      if (query.from) where.receivingDate.gte = new Date(query.from);
      if (query.to) { const end = new Date(query.to); end.setDate(end.getDate() + 1); where.receivingDate.lt = end; }
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 20));
    const [data, total] = await Promise.all([
      this.prisma.gasReceiving.findMany({ where, include: { supplier: true, purchase: true, tank: true }, orderBy: { receivingDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.gasReceiving.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSummary(companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, todayAgg, allAgg] = await Promise.all([
      this.prisma.gasReceiving.count({ where: { companyId } }),
      this.prisma.gasReceiving.aggregate({ where: { companyId, receivingDate: { gte: today, lt: tomorrow } }, _sum: { receivedQuantity: true }, _count: true }),
      this.prisma.gasReceiving.aggregate({ where: { companyId }, _sum: { receivedQuantity: true, variance: true } }),
    ]);

    return {
      total,
      todayCount: todayAgg._count,
      todayReceivedQuantity: todayAgg._sum.receivedQuantity || 0,
      totalReceivedQuantity: allAgg._sum.receivedQuantity || 0,
      totalVariance: allAgg._sum.variance || 0,
    };
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.gasReceiving.findFirst({
      where: { id, companyId },
      include: { supplier: true, purchase: true, tank: true },
    });
    if (!item) throw new NotFoundException(`GasReceiving ${id} not found`);
    return item;
  }

  async create(dto: CreateGasReceivingDto, companyId: string) {
    if (dto.receivedQuantity <= 0) {
      throw new BadRequestException('Received quantity must be greater than zero');
    }
    const variance = dto.receivedQuantity - dto.expectedQuantity;

    return this.prisma.$transaction(async (tx) => {
      const tank = await tx.storageTank.findUnique({ where: { id: dto.tankId } });
      if (!tank) throw new NotFoundException(`StorageTank ${dto.tankId} not found`);

      const newStock = tank.currentQuantity + dto.receivedQuantity;
      if (newStock > tank.capacity) {
        throw new BadRequestException(
          `Receiving ${dto.receivedQuantity} KG into ${tank.tankName} would exceed its capacity (${tank.currentQuantity}/${tank.capacity} KG currently).`,
        );
      }

      const receiving = await tx.gasReceiving.create({
        data: { ...dto, companyId, receivingDate: new Date(dto.receivingDate), variance },
        include: { supplier: true, purchase: true, tank: true },
      });

      await tx.storageTank.update({ where: { id: dto.tankId }, data: { currentQuantity: newStock } });
      await tx.gasInventoryTransaction.create({
        data: {
          companyId,
          transactionType: 'RECEIVING',
          referenceId: receiving.id,
          referenceType: 'GasReceiving',
          tankId: dto.tankId,
          gasProductId: tank.gasProductId,
          quantity: dto.receivedQuantity,
          previousStock: tank.currentQuantity,
          newStock,
          notes: `Gas receiving: ${dto.receivingNumber}`,
        },
      });

      return receiving;
    });
  }

  async update(id: string, dto: UpdateGasReceivingDto, companyId: string) {
    const existing = await this.findOne(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      const data: any = { ...dto };

      // If the received quantity is being corrected, apply only the delta
      // to the tank so the stock stays consistent with the edited record.
      if (dto.receivedQuantity !== undefined && dto.receivedQuantity !== existing.receivedQuantity) {
        const delta = dto.receivedQuantity - existing.receivedQuantity;
        const tank = await tx.storageTank.findUnique({ where: { id: existing.tankId } });
        if (tank) {
          const newStock = tank.currentQuantity + delta;
          if (newStock < 0) {
            throw new BadRequestException(`Correcting this receiving would take ${tank.tankName} below zero stock.`);
          }
          if (newStock > tank.capacity) {
            throw new BadRequestException(`Correcting this receiving would exceed ${tank.tankName}'s capacity.`);
          }
          await tx.storageTank.update({ where: { id: existing.tankId }, data: { currentQuantity: newStock } });
          await tx.gasInventoryTransaction.create({
            data: {
              companyId,
              transactionType: 'ADJUSTMENT',
              referenceId: id,
              referenceType: 'GasReceiving',
              tankId: existing.tankId,
              gasProductId: tank.gasProductId,
              quantity: delta,
              previousStock: tank.currentQuantity,
              newStock,
              notes: `Correction to gas receiving ${existing.receivingNumber}`,
            },
          });
        }
        data.variance = dto.receivedQuantity - existing.expectedQuantity;
      }

      return tx.gasReceiving.update({ where: { id }, data });
    });
  }

  async remove(id: string, companyId: string) {
    const existing = await this.findOne(id, companyId);
    return this.prisma.$transaction(async (tx) => {
      // Revert the stock this receiving had added, so deleting a mistaken
      // entry doesn't leave a permanent phantom addition on the tank.
      const tank = await tx.storageTank.findUnique({ where: { id: existing.tankId } });
      if (tank) {
        const newStock = Math.max(0, tank.currentQuantity - existing.receivedQuantity);
        await tx.storageTank.update({ where: { id: existing.tankId }, data: { currentQuantity: newStock } });
        await tx.gasInventoryTransaction.create({
          data: {
            companyId,
            transactionType: 'RECEIVING_DELETED',
            referenceId: id,
            referenceType: 'GasReceiving',
            tankId: existing.tankId,
            gasProductId: tank.gasProductId,
            quantity: -existing.receivedQuantity,
            previousStock: tank.currentQuantity,
            newStock,
            notes: `Gas receiving ${existing.receivingNumber} deleted — stock reverted`,
          },
        });
      }
      return tx.gasReceiving.delete({ where: { id } });
    });
  }
}
