import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.sale.findMany({
      include: { customer: true, saleItems: { include: { cylinderType: true } } },
      orderBy: { saleDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        saleItems: { include: { cylinderType: true } },
        saleReturns: true,
        payments: true,
      },
    });
    if (!item) throw new NotFoundException(`Sale ${id} not found`);
    return item;
  }

  async create(dto: CreateSaleDto) {
    const subtotal = dto.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
      return sum + itemTotal;
    }, 0);
    const netTotal = subtotal - (dto.discount || 0);
    const paidAmount = dto.paidAmount || 0;
    const remainingAmount = netTotal - paidAmount;
    const paymentStatus = remainingAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    const sale = await this.prisma.sale.create({
      data: {
        invoiceNumber: dto.invoiceNumber,
        customerId: dto.customerId,
        saleDate: new Date(dto.saleDate),
        subtotal,
        discount: dto.discount || 0,
        netTotal,
        paidAmount,
        remainingAmount,
        paymentMethod: dto.paymentMethod || 'CASH',
        paymentStatus,
        notes: dto.notes,
        createdById: dto.createdById,
        saleItems: {
          create: dto.items.map((item) => ({
            cylinderTypeId: item.cylinderTypeId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            totalPrice: item.quantity * item.unitPrice - (item.discount || 0),
          })),
        },
      },
      include: { customer: true, saleItems: { include: { cylinderType: true } } },
    });

    // Update customer balance if credit
    if (remainingAmount > 0) {
      await this.prisma.customer.update({
        where: { id: dto.customerId },
        data: { currentBalance: { increment: remainingAmount } },
      });
    }

    return sale;
  }

  async update(id: string, dto: UpdateSaleDto) {
    await this.findOne(id);
    return this.prisma.sale.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.sale.delete({ where: { id } });
  }
}
