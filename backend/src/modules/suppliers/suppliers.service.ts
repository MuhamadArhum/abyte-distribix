import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

export interface FindAllSuppliersQuery {
  search?: string;
  status?: string;
  balance?: string;
  paymentTerms?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  /** Plain array when no page/limit is given (existing dropdown callers keep
   * working unchanged); { data, total, page, limit } once paginated. */
  async findAll(companyId: string, query?: FindAllSuppliersQuery) {
    const where: any = { companyId };

    if (query?.search) {
      const q = query.search;
      where.OR = [
        { supplierName: { contains: q } },
        { supplierCode: { contains: q } },
        { phone: { contains: q } },
        { taxNtn: { contains: q } },
        { contactPerson: { contains: q } },
      ];
    }
    if (query?.status && query.status !== 'ALL') where.status = query.status;
    if (query?.paymentTerms && query.paymentTerms !== 'ALL') where.paymentTerms = Number(query.paymentTerms);
    if (query?.balance === 'HAS_BALANCE') where.currentBalance = { gt: 0 };
    else if (query?.balance === 'CLEAR') where.currentBalance = 0;

    const paginated = query?.page !== undefined || query?.limit !== undefined;
    if (!paginated) {
      return this.prisma.supplier.findMany({ where, orderBy: { supplierName: 'asc' } });
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 50));
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, orderBy: { supplierName: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSummary(companyId: string) {
    const [total, active, totalPayables, withBalance] = await Promise.all([
      this.prisma.supplier.count({ where: { companyId } }),
      this.prisma.supplier.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.supplier.aggregate({ where: { companyId, currentBalance: { gt: 0 } }, _sum: { currentBalance: true } }),
      this.prisma.supplier.count({ where: { companyId, currentBalance: { gt: 0 } } }),
    ]);
    return {
      total,
      active,
      inactive: total - active,
      totalPayables: totalPayables._sum.currentBalance || 0,
      withBalance,
    };
  }

  async findOne(id: string, companyId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
      include: {
        purchases: { orderBy: { createdAt: 'desc' } },
        supplierPayments: { orderBy: { createdAt: 'desc' } },
        gasReceivings: { orderBy: { receivingDate: 'desc' }, include: { tank: { select: { tankName: true } } } },
      },
    });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return supplier;
  }

  create(dto: CreateSupplierDto, companyId: string) {
    return this.prisma.supplier.create({ data: { ...dto, companyId, currentBalance: dto.openingBalance || 0 } });
  }

  async update(id: string, dto: UpdateSupplierDto, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.supplier.delete({ where: { id } });
  }

  async getLedger(id: string, companyId: string) {
    const supplier = await this.findOne(id, companyId);
    const purchases = await this.prisma.purchase.findMany({ where: { supplierId: id }, orderBy: { purchaseDate: 'asc' } });
    const payments = await this.prisma.supplierPayment.findMany({ where: { supplierId: id }, orderBy: { paymentDate: 'asc' } });

    const entries: any[] = [
      ...purchases.map((p) => ({ date: p.purchaseDate, description: `Purchase ${p.purchaseNumber}`, transactionType: 'PURCHASE', debit: p.netAmount, credit: p.paidAmount, ref: p.purchaseNumber })),
      ...payments.map((p) => ({ date: p.paymentDate, description: `Payment ${p.paymentNumber}${p.reference ? ' · ' + p.reference : ''}`, transactionType: 'PAYMENT', debit: 0, credit: p.amount, ref: p.paymentNumber })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = supplier.openingBalance || 0;
    const rows = entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });

    return [
      { date: null, description: 'Opening Balance', transactionType: 'OPENING', debit: 0, credit: 0, ref: '—', balance: supplier.openingBalance || 0 },
      ...rows,
    ];
  }
}
