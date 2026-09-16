import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerPaymentDto, CreateSupplierPaymentDto } from './dto/create-payment.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export interface FindAllPaymentsQuery {
  search?: string;
  method?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  private dateWhere(from?: string, to?: string) {
    if (!from && !to) return undefined;
    const where: any = {};
    if (from) where.gte = new Date(from);
    if (to) { const end = new Date(to); end.setDate(end.getDate() + 1); where.lt = end; }
    return where;
  }

  // Customer Payments
  async findAllCustomerPayments(companyId: string, query?: FindAllPaymentsQuery) {
    const where: any = { companyId };
    if (query?.search) {
      const q = query.search;
      where.OR = [
        { paymentNumber: { contains: q } },
        { customer: { businessName: { contains: q } } },
        { reference: { contains: q } },
      ];
    }
    if (query?.method && query.method !== 'ALL') where.paymentMethod = query.method;
    const dateFilter = this.dateWhere(query?.from, query?.to);
    if (dateFilter) where.paymentDate = dateFilter;

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 20));
    const [data, total] = await Promise.all([
      this.prisma.customerPayment.findMany({ where, include: { customer: true }, orderBy: { paymentDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.customerPayment.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getCustomerPaymentsSummary(companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const [total, todayAgg, allAgg] = await Promise.all([
      this.prisma.customerPayment.count({ where: { companyId } }),
      this.prisma.customerPayment.aggregate({ where: { companyId, paymentDate: { gte: today, lt: tomorrow } }, _sum: { amount: true }, _count: true }),
      this.prisma.customerPayment.aggregate({ where: { companyId }, _sum: { amount: true } }),
    ]);
    return { total, todayTotal: todayAgg._sum.amount || 0, todayCount: todayAgg._count, allTotal: allAgg._sum.amount || 0 };
  }

  async findOneCustomerPayment(id: string, companyId: string) {
    const item = await this.prisma.customerPayment.findFirst({ where: { id, companyId }, include: { customer: true, sale: true } });
    if (!item) throw new NotFoundException(`CustomerPayment ${id} not found`);
    return item;
  }

  async createCustomerPayment(dto: CreateCustomerPaymentDto, companyId: string, actorUserId?: string) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.customerPayment.create({
        data: { ...dto, companyId, paymentDate: new Date(dto.paymentDate) },
        include: { customer: true },
      });

      // Reduce customer balance
      await tx.customer.update({
        where: { id: dto.customerId },
        data: { currentBalance: { decrement: dto.amount } },
      });

      // If this payment is against a specific invoice, keep that invoice's
      // own paid/remaining/status in sync — not just the aggregate balance.
      if (dto.saleId) {
        const sale = await tx.sale.findUnique({ where: { id: dto.saleId } });
        if (sale) {
          const newPaid = sale.paidAmount + dto.amount;
          const newRemaining = sale.netTotal - newPaid;
          const newStatus = newRemaining <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
          await tx.sale.update({
            where: { id: dto.saleId },
            data: { paidAmount: newPaid, remainingAmount: newRemaining, paymentStatus: newStatus },
          });
        }
      }

      // Record in cash book
      const lastTx = await tx.cashTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
      const prevBalance = lastTx?.balance ?? 0;
      await tx.cashTransaction.create({
        data: {
          companyId,
          transactionType: 'CUSTOMER_PAYMENT',
          referenceId: payment.id,
          referenceType: 'CustomerPayment',
          amount: dto.amount,
          direction: 'IN',
          balance: prevBalance + dto.amount,
          description: `Payment from ${payment.customer?.businessName || dto.customerId} · ${payment.paymentNumber}`,
        },
      });
      return payment;
    });

    await this.auditLogsService.log({
      userId: actorUserId,
      action: 'CREATE',
      module: 'CustomerPayments',
      recordId: payment.id,
      newValue: { customerId: payment.customerId, amount: payment.amount, saleId: payment.saleId },
    });

    return payment;
  }

  async removeCustomerPayment(id: string, companyId: string, actorUserId?: string) {
    const existing = await this.findOneCustomerPayment(id, companyId);

    const deleted = await this.prisma.$transaction(async (tx) => {
      // Reverse the balance reduction this payment made.
      await tx.customer.update({
        where: { id: existing.customerId },
        data: { currentBalance: { increment: existing.amount } },
      });

      if (existing.saleId) {
        const sale = await tx.sale.findUnique({ where: { id: existing.saleId } });
        if (sale) {
          const newPaid = Math.max(0, sale.paidAmount - existing.amount);
          const newRemaining = sale.netTotal - newPaid;
          const newStatus = newRemaining <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
          await tx.sale.update({
            where: { id: existing.saleId },
            data: { paidAmount: newPaid, remainingAmount: newRemaining, paymentStatus: newStatus },
          });
        }
      }

      // Reverse (not delete) whichever book this payment was recorded into —
      // a financial ledger entry should never just vanish, or every later
      // row's running `balance` silently becomes wrong.
      const cashEntry = await tx.cashTransaction.findFirst({ where: { companyId, referenceId: id, referenceType: 'CustomerPayment' } });
      if (cashEntry) {
        const lastTx = await tx.cashTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
        const prevBalance = lastTx?.balance ?? 0;
        const reversedDirection = cashEntry.direction === 'IN' ? 'OUT' : 'IN';
        await tx.cashTransaction.create({
          data: {
            companyId,
            transactionType: 'CUSTOMER_PAYMENT_DELETED',
            referenceId: id,
            referenceType: 'CustomerPayment',
            amount: cashEntry.amount,
            direction: reversedDirection,
            balance: reversedDirection === 'IN' ? prevBalance + cashEntry.amount : prevBalance - cashEntry.amount,
            description: `Reversal — payment ${existing.paymentNumber} deleted`,
          },
        });
      }
      const bankEntry = await tx.bankTransaction.findFirst({ where: { companyId, referenceId: id, referenceType: 'CustomerPayment' } });
      if (bankEntry) {
        const lastTx = await tx.bankTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
        const prevBalance = lastTx?.balance ?? 0;
        const reversedDirection = bankEntry.direction === 'IN' ? 'OUT' : 'IN';
        await tx.bankTransaction.create({
          data: {
            companyId,
            transactionType: 'CUSTOMER_PAYMENT_DELETED',
            referenceId: id,
            referenceType: 'CustomerPayment',
            amount: bankEntry.amount,
            direction: reversedDirection,
            balance: reversedDirection === 'IN' ? prevBalance + bankEntry.amount : prevBalance - bankEntry.amount,
            description: `Reversal — payment ${existing.paymentNumber} deleted`,
          },
        });
      }

      return tx.customerPayment.delete({ where: { id } });
    });

    await this.auditLogsService.log({
      userId: actorUserId,
      action: 'DELETE',
      module: 'CustomerPayments',
      recordId: id,
      previousValue: { paymentNumber: existing.paymentNumber, customerId: existing.customerId, amount: existing.amount, saleId: existing.saleId },
    });

    return deleted;
  }

  // Supplier Payments
  async findAllSupplierPayments(companyId: string, query?: FindAllPaymentsQuery) {
    const where: any = { companyId };
    if (query?.search) {
      const q = query.search;
      where.OR = [
        { paymentNumber: { contains: q } },
        { supplier: { supplierName: { contains: q } } },
        { reference: { contains: q } },
      ];
    }
    if (query?.method && query.method !== 'ALL') where.paymentMethod = query.method;
    const dateFilter = this.dateWhere(query?.from, query?.to);
    if (dateFilter) where.paymentDate = dateFilter;

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 20));
    const [data, total] = await Promise.all([
      this.prisma.supplierPayment.findMany({ where, include: { supplier: true }, orderBy: { paymentDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.supplierPayment.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSupplierPaymentsSummary(companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const [total, todayAgg, allAgg] = await Promise.all([
      this.prisma.supplierPayment.count({ where: { companyId } }),
      this.prisma.supplierPayment.aggregate({ where: { companyId, paymentDate: { gte: today, lt: tomorrow } }, _sum: { amount: true }, _count: true }),
      this.prisma.supplierPayment.aggregate({ where: { companyId }, _sum: { amount: true } }),
    ]);
    return { total, todayTotal: todayAgg._sum.amount || 0, todayCount: todayAgg._count, allTotal: allAgg._sum.amount || 0 };
  }

  async findOneSupplierPayment(id: string, companyId: string) {
    const item = await this.prisma.supplierPayment.findFirst({ where: { id, companyId }, include: { supplier: true, purchase: true } });
    if (!item) throw new NotFoundException(`SupplierPayment ${id} not found`);
    return item;
  }

  async createSupplierPayment(dto: CreateSupplierPaymentDto, companyId: string, actorUserId?: string) {
    const payment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({
        data: { ...dto, companyId, paymentDate: new Date(dto.paymentDate) },
        include: { supplier: true },
      });

      // Reduce supplier balance
      await tx.supplier.update({
        where: { id: dto.supplierId },
        data: { currentBalance: { decrement: dto.amount } },
      });

      if (dto.purchaseId) {
        const purchase = await tx.purchase.findUnique({ where: { id: dto.purchaseId } });
        if (purchase) {
          const newPaid = purchase.paidAmount + dto.amount;
          const newRemaining = purchase.netAmount - newPaid;
          const newStatus = newRemaining <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
          await tx.purchase.update({
            where: { id: dto.purchaseId },
            data: { paidAmount: newPaid, remainingAmount: newRemaining, paymentStatus: newStatus },
          });
        }
      }

      // Record in cash book as outflow
      const lastTx = await tx.cashTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
      const prevBalance = lastTx?.balance ?? 0;
      await tx.cashTransaction.create({
        data: {
          companyId,
          transactionType: 'SUPPLIER_PAYMENT',
          referenceId: payment.id,
          referenceType: 'SupplierPayment',
          amount: dto.amount,
          direction: 'OUT',
          balance: prevBalance - dto.amount,
          description: `Payment to ${payment.supplier?.supplierName || dto.supplierId} · ${payment.paymentNumber}`,
        },
      });
      return payment;
    });

    await this.auditLogsService.log({
      userId: actorUserId,
      action: 'CREATE',
      module: 'SupplierPayments',
      recordId: payment.id,
      newValue: { supplierId: payment.supplierId, amount: payment.amount, purchaseId: payment.purchaseId },
    });

    return payment;
  }

  async removeSupplierPayment(id: string, companyId: string, actorUserId?: string) {
    const existing = await this.findOneSupplierPayment(id, companyId);

    const deleted = await this.prisma.$transaction(async (tx) => {
      // Reverse the balance reduction this payment made.
      await tx.supplier.update({
        where: { id: existing.supplierId },
        data: { currentBalance: { increment: existing.amount } },
      });

      if (existing.purchaseId) {
        const purchase = await tx.purchase.findUnique({ where: { id: existing.purchaseId } });
        if (purchase) {
          const newPaid = Math.max(0, purchase.paidAmount - existing.amount);
          const newRemaining = purchase.netAmount - newPaid;
          const newStatus = newRemaining <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';
          await tx.purchase.update({
            where: { id: existing.purchaseId },
            data: { paidAmount: newPaid, remainingAmount: newRemaining, paymentStatus: newStatus },
          });
        }
      }

      const cashEntry = await tx.cashTransaction.findFirst({ where: { companyId, referenceId: id, referenceType: 'SupplierPayment' } });
      if (cashEntry) {
        const lastTx = await tx.cashTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
        const prevBalance = lastTx?.balance ?? 0;
        const reversedDirection = cashEntry.direction === 'IN' ? 'OUT' : 'IN';
        await tx.cashTransaction.create({
          data: {
            companyId,
            transactionType: 'SUPPLIER_PAYMENT_DELETED',
            referenceId: id,
            referenceType: 'SupplierPayment',
            amount: cashEntry.amount,
            direction: reversedDirection,
            balance: reversedDirection === 'IN' ? prevBalance + cashEntry.amount : prevBalance - cashEntry.amount,
            description: `Reversal — payment ${existing.paymentNumber} deleted`,
          },
        });
      }
      const bankEntry = await tx.bankTransaction.findFirst({ where: { companyId, referenceId: id, referenceType: 'SupplierPayment' } });
      if (bankEntry) {
        const lastTx = await tx.bankTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
        const prevBalance = lastTx?.balance ?? 0;
        const reversedDirection = bankEntry.direction === 'IN' ? 'OUT' : 'IN';
        await tx.bankTransaction.create({
          data: {
            companyId,
            transactionType: 'SUPPLIER_PAYMENT_DELETED',
            referenceId: id,
            referenceType: 'SupplierPayment',
            amount: bankEntry.amount,
            direction: reversedDirection,
            balance: reversedDirection === 'IN' ? prevBalance + bankEntry.amount : prevBalance - bankEntry.amount,
            description: `Reversal — payment ${existing.paymentNumber} deleted`,
          },
        });
      }

      return tx.supplierPayment.delete({ where: { id } });
    });

    await this.auditLogsService.log({
      userId: actorUserId,
      action: 'DELETE',
      module: 'SupplierPayments',
      recordId: id,
      previousValue: { paymentNumber: existing.paymentNumber, supplierId: existing.supplierId, amount: existing.amount, purchaseId: existing.purchaseId },
    });

    return deleted;
  }
}
