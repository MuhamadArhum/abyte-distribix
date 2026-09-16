import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleReturnDto } from './dto/create-sale-return.dto';

@Injectable()
export class SaleReturnsService {
  constructor(private prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.saleReturn.findMany({
      where: { companyId },
      include: { sale: true, customer: true, items: { include: { cylinderType: true } } },
      orderBy: { returnDate: 'desc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.saleReturn.findFirst({
      where: { id, companyId },
      include: { sale: true, customer: true, items: { include: { cylinderType: true } } },
    });
    if (!item) throw new NotFoundException(`SaleReturn ${id} not found`);
    return item;
  }

  async create(dto: CreateSaleReturnDto, companyId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one return item is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: dto.saleId, companyId },
        include: { saleItems: true, saleReturns: { include: { items: true } } },
      });
      if (!sale) throw new NotFoundException(`Sale ${dto.saleId} not found`);

      // How much of each original saleItem has already been returned.
      const alreadyReturned = new Map<string, number>();
      for (const ret of sale.saleReturns) {
        for (const item of ret.items) {
          alreadyReturned.set(item.saleItemId, (alreadyReturned.get(item.saleItemId) || 0) + item.quantity);
        }
      }

      let totalAmount = 0;
      const itemsToCreate: { companyId: string; saleItemId: string; cylinderTypeId: string; quantity: number; unitPrice: number; totalPrice: number }[] = [];
      const byCylinderType = new Map<string, number>();

      for (const reqItem of dto.items) {
        const saleItem = sale.saleItems.find((si) => si.id === reqItem.saleItemId);
        if (!saleItem) {
          throw new BadRequestException(`Sale item ${reqItem.saleItemId} does not belong to sale ${sale.invoiceNumber}`);
        }
        const returnedSoFar = alreadyReturned.get(saleItem.id) || 0;
        const returnable = saleItem.quantity - returnedSoFar;
        if (reqItem.quantity > returnable) {
          throw new BadRequestException(
            `Cannot return ${reqItem.quantity} units of this line — only ${returnable} remain returnable (sold ${saleItem.quantity}, already returned ${returnedSoFar}).`,
          );
        }

        const totalPrice = reqItem.quantity * saleItem.unitPrice;
        totalAmount += totalPrice;
        itemsToCreate.push({
          companyId,
          saleItemId: saleItem.id,
          cylinderTypeId: saleItem.cylinderTypeId,
          quantity: reqItem.quantity,
          unitPrice: saleItem.unitPrice,
          totalPrice,
        });
        byCylinderType.set(saleItem.cylinderTypeId, (byCylinderType.get(saleItem.cylinderTypeId) || 0) + reqItem.quantity);
      }

      const saleReturn = await tx.saleReturn.create({
        data: {
          companyId,
          returnNumber: dto.returnNumber,
          saleId: dto.saleId,
          customerId: sale.customerId,
          returnDate: new Date(dto.returnDate),
          reason: dto.reason,
          notes: dto.notes,
          totalAmount,
          items: { create: itemsToCreate },
        },
        include: { items: { include: { cylinderType: true } }, customer: true },
      });

      // Restore stock: WITH_CUSTOMER -> FILLED (the returned cylinders come
      // back as usable filled stock; damaged returns should instead be
      // reclassified manually via the Cylinders/Inventory screens).
      for (const [cylinderTypeId, quantity] of byCylinderType) {
        await tx.cylinderInventory.update({
          where: { cylinderTypeId_status: { cylinderTypeId, status: 'WITH_CUSTOMER' } },
          data: { quantity: { decrement: quantity } },
        }).catch(() => undefined);
        await tx.cylinderInventory.upsert({
          where: { cylinderTypeId_status: { cylinderTypeId, status: 'FILLED' } },
          update: { quantity: { increment: quantity } },
          create: { companyId, cylinderTypeId, status: 'FILLED', quantity },
        });
        await tx.cylinderTransaction.create({
          data: {
            companyId,
            transactionType: 'SALE_RETURN',
            referenceId: saleReturn.id,
            cylinderTypeId,
            quantity,
            fromStatus: 'WITH_CUSTOMER',
            toStatus: 'FILLED',
            customerId: sale.customerId,
            notes: `Return ${dto.returnNumber} against sale ${sale.invoiceNumber}`,
          },
        });
      }

      // Credit the customer for the returned value.
      if (totalAmount > 0) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { currentBalance: { decrement: totalAmount } },
        });
      }

      return saleReturn;
    });
  }
}
