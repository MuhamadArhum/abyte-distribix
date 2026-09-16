import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export interface FindAllPurchasesQuery {
  search?: string;
  status?: string;
  supplierId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  /** `page` present -> { data, total, page, limit } (PurchasesPage's
   * server-side pagination). No `page` -> plain array, optionally capped by
   * `limit` — the shape GasReceiving/SupplierPayments dropdown callers rely on. */
  async findAll(companyId: string, query?: FindAllPurchasesQuery) {
    const where: any = { companyId };
    if (query?.search) {
      const q = query.search;
      where.OR = [
        { purchaseNumber: { contains: q } },
        { supplier: { supplierName: { contains: q } } },
        { gasProduct: { productName: { contains: q } } },
      ];
    }
    if (query?.status && query.status !== 'ALL') where.paymentStatus = query.status;
    if (query?.supplierId) where.supplierId = query.supplierId;
    if (query?.from || query?.to) {
      where.purchaseDate = {};
      if (query.from) where.purchaseDate.gte = new Date(query.from);
      if (query.to) { const end = new Date(query.to); end.setDate(end.getDate() + 1); where.purchaseDate.lt = end; }
    }

    if (query?.page === undefined) {
      return this.prisma.purchase.findMany({
        where, include: { supplier: true, gasProduct: true }, orderBy: { purchaseDate: 'desc' },
        ...(query?.limit ? { take: Number(query.limit) } : {}),
      });
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 20));
    const [data, total] = await Promise.all([
      this.prisma.purchase.findMany({ where, include: { supplier: true, gasProduct: true }, orderBy: { purchaseDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.purchase.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSummary(companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [total, todayAgg, monthAgg, outstandingAgg, unpaidCount] = await Promise.all([
      this.prisma.purchase.count({ where: { companyId } }),
      this.prisma.purchase.aggregate({ where: { companyId, purchaseDate: { gte: today, lt: tomorrow } }, _sum: { netAmount: true }, _count: true }),
      this.prisma.purchase.aggregate({ where: { companyId, purchaseDate: { gte: monthStart, lt: tomorrow } }, _sum: { netAmount: true } }),
      this.prisma.purchase.aggregate({ where: { companyId }, _sum: { remainingAmount: true } }),
      this.prisma.purchase.count({ where: { companyId, paymentStatus: { not: 'PAID' } } }),
    ]);

    return {
      total,
      todayTotal: todayAgg._sum.netAmount || 0,
      todayCount: todayAgg._count,
      monthTotal: monthAgg._sum.netAmount || 0,
      totalOutstanding: outstandingAgg._sum.remainingAmount || 0,
      unpaidCount,
    };
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.purchase.findFirst({
      where: { id, companyId },
      include: { supplier: true, gasProduct: true, gasReceivings: true, supplierPayments: true },
    });
    if (!item) throw new NotFoundException(`Purchase ${id} not found`);
    return item;
  }

  async create(dto: CreatePurchaseDto, companyId: string, actorUserId?: string) {
    const gasAmount = dto.quantity * dto.purchaseRate;
    const grossAmount = gasAmount + (dto.transportation || 0) + (dto.otherCharges || 0);
    const netAmount = grossAmount - (dto.discount || 0);

    const purchase = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          ...dto,
          companyId,
          purchaseDate: new Date(dto.purchaseDate),
          gasAmount,
          grossAmount,
          netAmount,
          remainingAmount: netAmount,
          paymentStatus: 'UNPAID',
        },
        include: { supplier: true, gasProduct: true },
      });

      // A new purchase is money owed to the supplier until paid off.
      if (netAmount > 0) {
        await tx.supplier.update({
          where: { id: dto.supplierId },
          data: { currentBalance: { increment: netAmount } },
        });
      }

      return purchase;
    });

    await this.auditLogsService.log({
      userId: actorUserId,
      action: 'CREATE',
      module: 'Purchases',
      recordId: purchase.id,
      newValue: { purchaseNumber: purchase.purchaseNumber, supplierId: purchase.supplierId, netAmount: purchase.netAmount },
    });

    return purchase;
  }

  async update(id: string, dto: UpdatePurchaseDto, companyId: string) {
    const existing = await this.findOne(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      // paymentStatus is always derived server-side from paidAmount vs
      // netAmount — a client can never set it to an inconsistent value.
      const paidAmount = dto.paidAmount !== undefined ? dto.paidAmount : existing.paidAmount;
      const remainingAmount = existing.netAmount - paidAmount;
      const paymentStatus = remainingAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

      const updated = await tx.purchase.update({
        where: { id },
        data: { ...dto, paidAmount, remainingAmount, paymentStatus },
      });

      const delta = remainingAmount - existing.remainingAmount;
      if (delta !== 0) {
        await tx.supplier.update({
          where: { id: existing.supplierId },
          data: { currentBalance: { increment: delta } },
        });
      }

      return updated;
    });
  }

  async remove(id: string, companyId: string, actorUserId?: string) {
    const existing = await this.findOne(id, companyId);
    const deleted = await this.prisma.$transaction(async (tx) => {
      // Reverse the outstanding-balance impact this purchase had, so
      // deleting it doesn't leave the supplier's payable permanently stale.
      if (existing.remainingAmount !== 0) {
        await tx.supplier.update({
          where: { id: existing.supplierId },
          data: { currentBalance: { decrement: existing.remainingAmount } },
        });
      }
      return tx.purchase.delete({ where: { id } });
    });

    await this.auditLogsService.log({
      userId: actorUserId,
      action: 'DELETE',
      module: 'Purchases',
      recordId: id,
      previousValue: { purchaseNumber: existing.purchaseNumber, netAmount: existing.netAmount, remainingAmount: existing.remainingAmount },
    });

    return deleted;
  }
}
