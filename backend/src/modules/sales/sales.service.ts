import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export interface FindAllSalesQuery {
  search?: string;
  status?: string;
  method?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  async findAll(companyId: string, query?: FindAllSalesQuery) {
    const where: any = { companyId };
    if (query?.search) {
      const q = query.search;
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customer: { businessName: { contains: q } } },
      ];
    }
    if (query?.status && query.status !== 'ALL') where.paymentStatus = query.status;
    if (query?.method && query.method !== 'ALL') where.paymentMethod = query.method;
    if (query?.from || query?.to) {
      where.saleDate = {};
      if (query.from) where.saleDate.gte = new Date(query.from);
      if (query.to) { const end = new Date(query.to); end.setDate(end.getDate() + 1); where.saleDate.lt = end; }
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 20));
    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({ where, include: { customer: true, saleItems: { include: { cylinderType: true } } }, orderBy: { saleDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.sale.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSummary(companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [total, todayAgg, monthAgg, outstandingAgg, unpaidCount] = await Promise.all([
      this.prisma.sale.count({ where: { companyId } }),
      this.prisma.sale.aggregate({ where: { companyId, saleDate: { gte: today, lt: tomorrow } }, _sum: { netTotal: true }, _count: true }),
      this.prisma.sale.aggregate({ where: { companyId, saleDate: { gte: monthStart, lt: tomorrow } }, _sum: { netTotal: true } }),
      this.prisma.sale.aggregate({ where: { companyId }, _sum: { remainingAmount: true } }),
      this.prisma.sale.count({ where: { companyId, paymentStatus: { not: 'PAID' } } }),
    ]);

    return {
      total,
      todayRevenue: todayAgg._sum.netTotal || 0,
      todayCount: todayAgg._count,
      monthRevenue: monthAgg._sum.netTotal || 0,
      totalOutstanding: outstandingAgg._sum.remainingAmount || 0,
      unpaidCount,
    };
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.sale.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        saleItems: { include: { cylinderType: true } },
        saleReturns: { include: { items: true } },
        payments: true,
      },
    });
    if (!item) throw new NotFoundException(`Sale ${id} not found`);
    return item;
  }

  async create(dto: CreateSaleDto, companyId: string, actorUserId?: string) {
    const subtotal = dto.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
      return sum + itemTotal;
    }, 0);
    const netTotal = subtotal - (dto.discount || 0);
    const paidAmount = dto.paidAmount || 0;
    const remainingAmount = netTotal - paidAmount;
    const paymentStatus = remainingAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
    const paymentMethod = dto.paymentMethod || 'CASH';

    const sale = await this.prisma.$transaction(async (tx) => {
      // Merge quantities per cylinder type in case the same type appears in
      // more than one line, then validate stock BEFORE writing anything.
      const neededByType = new Map<string, number>();
      for (const item of dto.items) {
        neededByType.set(item.cylinderTypeId, (neededByType.get(item.cylinderTypeId) || 0) + item.quantity);
      }
      for (const [cylinderTypeId, needed] of neededByType) {
        const inv = await tx.cylinderInventory.findUnique({
          where: { cylinderTypeId_status: { cylinderTypeId, status: 'FILLED' } },
        });
        const available = inv?.quantity || 0;
        if (available < needed) {
          const type = await tx.cylinderType.findUnique({ where: { id: cylinderTypeId } });
          throw new BadRequestException(
            `Insufficient filled stock for ${type?.cylinderSize || cylinderTypeId}: have ${available}, need ${needed}`,
          );
        }
      }

      const sale = await tx.sale.create({
        data: {
          companyId,
          invoiceNumber: dto.invoiceNumber,
          customerId: dto.customerId,
          saleDate: new Date(dto.saleDate),
          subtotal,
          discount: dto.discount || 0,
          netTotal,
          paidAmount,
          remainingAmount,
          paymentMethod,
          paymentStatus,
          notes: dto.notes,
          createdById: dto.createdById,
          saleItems: {
            create: dto.items.map((item) => ({
              companyId,
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

      // Move stock: FILLED -> WITH_CUSTOMER, one movement per cylinder type.
      for (const [cylinderTypeId, quantity] of neededByType) {
        await tx.cylinderInventory.update({
          where: { cylinderTypeId_status: { cylinderTypeId, status: 'FILLED' } },
          data: { quantity: { decrement: quantity } },
        });
        await tx.cylinderInventory.upsert({
          where: { cylinderTypeId_status: { cylinderTypeId, status: 'WITH_CUSTOMER' } },
          update: { quantity: { increment: quantity } },
          create: { companyId, cylinderTypeId, status: 'WITH_CUSTOMER', quantity },
        });
        await tx.cylinderTransaction.create({
          data: {
            companyId,
            transactionType: 'SALE',
            referenceId: sale.id,
            cylinderTypeId,
            quantity,
            fromStatus: 'FILLED',
            toStatus: 'WITH_CUSTOMER',
            customerId: dto.customerId,
            notes: `Sale ${dto.invoiceNumber}`,
            createdById: dto.createdById,
          },
        });
      }

      // Update customer balance for whatever remains unpaid.
      if (remainingAmount > 0) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { currentBalance: { increment: remainingAmount } },
        });
      }

      // Cash actually collected at point-of-sale feeds the cash/bank book.
      if (paidAmount > 0) {
        const isCash = paymentMethod === 'CASH';
        if (isCash) {
          const lastTx = await tx.cashTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
          const prevBalance = lastTx?.balance ?? 0;
          await tx.cashTransaction.create({
            data: {
              companyId,
              transactionType: 'SALE',
              referenceId: sale.id,
              referenceType: 'Sale',
              amount: paidAmount,
              direction: 'IN',
              balance: prevBalance + paidAmount,
              description: `Sale ${dto.invoiceNumber} — ${sale.customer?.businessName || dto.customerId}`,
            },
          });
        } else {
          const lastTx = await tx.bankTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
          const prevBalance = lastTx?.balance ?? 0;
          await tx.bankTransaction.create({
            data: {
              companyId,
              transactionType: 'SALE',
              referenceId: sale.id,
              referenceType: 'Sale',
              amount: paidAmount,
              direction: 'IN',
              balance: prevBalance + paidAmount,
              description: `Sale ${dto.invoiceNumber} — ${sale.customer?.businessName || dto.customerId}`,
            },
          });
        }
      }

      return sale;
    });

    await this.auditLogsService.log({
      userId: actorUserId,
      action: 'CREATE',
      module: 'Sales',
      recordId: sale.id,
      newValue: { invoiceNumber: sale.invoiceNumber, customerId: sale.customerId, netTotal: sale.netTotal, paymentStatus: sale.paymentStatus },
    });

    return sale;
  }

  async update(id: string, dto: UpdateSaleDto, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.sale.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string, actorUserId?: string) {
    const existing = await this.findOne(id, companyId);

    if (existing.payments && existing.payments.length > 0) {
      throw new ConflictException(
        `Cannot delete sale ${existing.invoiceNumber}: it has ${existing.payments.length} recorded payment(s) against it. Delete or reassign those payments first.`,
      );
    }
    if (existing.saleReturns && existing.saleReturns.length > 0) {
      throw new ConflictException(
        `Cannot delete sale ${existing.invoiceNumber}: it has recorded returns against it.`,
      );
    }

    const deleted = await this.prisma.$transaction(async (tx) => {
      // Restore stock this sale had taken out (WITH_CUSTOMER -> FILLED).
      const byType = new Map<string, number>();
      for (const item of existing.saleItems) {
        byType.set(item.cylinderTypeId, (byType.get(item.cylinderTypeId) || 0) + item.quantity);
      }
      for (const [cylinderTypeId, quantity] of byType) {
        await tx.cylinderInventory.upsert({
          where: { cylinderTypeId_status: { cylinderTypeId, status: 'FILLED' } },
          update: { quantity: { increment: quantity } },
          create: { companyId, cylinderTypeId, status: 'FILLED', quantity },
        });
        await tx.cylinderInventory.update({
          where: { cylinderTypeId_status: { cylinderTypeId, status: 'WITH_CUSTOMER' } },
          data: { quantity: { decrement: quantity } },
        }).catch(() => undefined); // best-effort if the row is somehow missing
        await tx.cylinderTransaction.create({
          data: {
            companyId,
            transactionType: 'SALE_DELETED',
            referenceId: id,
            cylinderTypeId,
            quantity,
            fromStatus: 'WITH_CUSTOMER',
            toStatus: 'FILLED',
            notes: `Sale ${existing.invoiceNumber} deleted — stock restored`,
          },
        });
      }

      // Reverse the outstanding-balance impact this sale had.
      if (existing.remainingAmount !== 0) {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: { currentBalance: { decrement: existing.remainingAmount } },
        });
      }

      // Reverse (not delete) any cash/bank entry this sale created — a
      // financial ledger entry should never just vanish, or every later
      // row's running `balance` silently becomes wrong. A dated reversal
      // keeps the audit trail intact and the running total correct.
      const cashEntry = await tx.cashTransaction.findFirst({ where: { companyId, referenceId: id, referenceType: 'Sale' } });
      if (cashEntry) {
        const lastTx = await tx.cashTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
        const prevBalance = lastTx?.balance ?? 0;
        const reversedDirection = cashEntry.direction === 'IN' ? 'OUT' : 'IN';
        await tx.cashTransaction.create({
          data: {
            companyId,
            transactionType: 'SALE_DELETED',
            referenceId: id,
            referenceType: 'Sale',
            amount: cashEntry.amount,
            direction: reversedDirection,
            balance: reversedDirection === 'IN' ? prevBalance + cashEntry.amount : prevBalance - cashEntry.amount,
            description: `Reversal — sale ${existing.invoiceNumber} deleted`,
          },
        });
      }
      const bankEntry = await tx.bankTransaction.findFirst({ where: { companyId, referenceId: id, referenceType: 'Sale' } });
      if (bankEntry) {
        const lastTx = await tx.bankTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
        const prevBalance = lastTx?.balance ?? 0;
        const reversedDirection = bankEntry.direction === 'IN' ? 'OUT' : 'IN';
        await tx.bankTransaction.create({
          data: {
            companyId,
            transactionType: 'SALE_DELETED',
            referenceId: id,
            referenceType: 'Sale',
            amount: bankEntry.amount,
            direction: reversedDirection,
            balance: reversedDirection === 'IN' ? prevBalance + bankEntry.amount : prevBalance - bankEntry.amount,
            description: `Reversal — sale ${existing.invoiceNumber} deleted`,
          },
        });
      }

      return tx.sale.delete({ where: { id } });
    });

    await this.auditLogsService.log({
      userId: actorUserId,
      action: 'DELETE',
      module: 'Sales',
      recordId: id,
      previousValue: { invoiceNumber: existing.invoiceNumber, netTotal: existing.netTotal, remainingAmount: existing.remainingAmount },
    });

    return deleted;
  }
}
