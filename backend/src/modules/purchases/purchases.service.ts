import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.purchase.findMany({
      include: { supplier: true, gasProduct: true },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.purchase.findUnique({
      where: { id },
      include: { supplier: true, gasProduct: true, gasReceivings: true, supplierPayments: true },
    });
    if (!item) throw new NotFoundException(`Purchase ${id} not found`);
    return item;
  }

  async create(dto: CreatePurchaseDto) {
    const gasAmount = dto.quantity * dto.purchaseRate;
    const grossAmount = gasAmount + (dto.transportation || 0) + (dto.otherCharges || 0);
    const netAmount = grossAmount - (dto.discount || 0);
    return this.prisma.purchase.create({
      data: {
        ...dto,
        purchaseDate: new Date(dto.purchaseDate),
        gasAmount,
        grossAmount,
        netAmount,
        remainingAmount: netAmount,
        paymentStatus: 'UNPAID',
      },
      include: { supplier: true, gasProduct: true },
    });
  }

  async update(id: string, dto: UpdatePurchaseDto) {
    await this.findOne(id);
    return this.prisma.purchase.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.purchase.delete({ where: { id } });
  }
}
