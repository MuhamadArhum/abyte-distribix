import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGasReceivingDto } from './dto/create-gas-receiving.dto';
import { UpdateGasReceivingDto } from './dto/update-gas-receiving.dto';

@Injectable()
export class GasReceivingService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.gasReceiving.findMany({
      include: { supplier: true, purchase: true, tank: true },
      orderBy: { receivingDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.gasReceiving.findUnique({
      where: { id },
      include: { supplier: true, purchase: true, tank: true },
    });
    if (!item) throw new NotFoundException(`GasReceiving ${id} not found`);
    return item;
  }

  async create(dto: CreateGasReceivingDto) {
    const variance = dto.receivedQuantity - dto.expectedQuantity;
    const receiving = await this.prisma.gasReceiving.create({
      data: { ...dto, receivingDate: new Date(dto.receivingDate), variance },
      include: { supplier: true, purchase: true, tank: true },
    });

    // Update tank stock
    const tank = await this.prisma.storageTank.findUnique({ where: { id: dto.tankId } });
    if (tank) {
      const newStock = tank.currentQuantity + dto.receivedQuantity;
      await this.prisma.storageTank.update({ where: { id: dto.tankId }, data: { currentQuantity: newStock } });
      await this.prisma.gasInventoryTransaction.create({
        data: {
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
    }

    return receiving;
  }

  async update(id: string, dto: UpdateGasReceivingDto) {
    await this.findOne(id);
    return this.prisma.gasReceiving.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.gasReceiving.delete({ where: { id } });
  }
}
