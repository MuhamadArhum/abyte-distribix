import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

export interface FindAllCustomersQuery {
  search?: string;
  customerType?: string;
  status?: string;
  balance?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  /** Plain array when no page/limit is given (existing dropdown callers keep
   * working unchanged); { data, total, page, limit } once paginated. */
  async findAll(companyId: string, query?: FindAllCustomersQuery) {
    const where: any = { companyId };

    if (query?.search) {
      const q = query.search;
      where.OR = [
        { businessName: { contains: q } },
        { customerCode: { contains: q } },
        { phone: { contains: q } },
        { contactPerson: { contains: q } },
      ];
    }
    if (query?.customerType && query.customerType !== 'ALL') where.customerType = query.customerType;
    if (query?.status && query.status !== 'ALL') where.status = query.status;

    if (query?.balance === 'HAS_BALANCE') {
      where.currentBalance = { gt: 0 };
    } else if (query?.balance === 'CLEAR') {
      where.currentBalance = 0;
    } else if (query?.balance === 'OVERDUE') {
      // currentBalance > creditLimit can't be expressed as a Prisma `where`
      // (no cross-column comparison on SQLite), so resolve the matching ids
      // with a light id-only query first, then filter the real query by them
      // — keeps `total`/pagination accurate instead of just filtering a page.
      const rows = await this.prisma.customer.findMany({
        where, select: { id: true, currentBalance: true, creditLimit: true },
      });
      where.id = { in: rows.filter((r) => r.currentBalance > r.creditLimit).map((r) => r.id) };
    }

    const paginated = query?.page !== undefined || query?.limit !== undefined;
    if (!paginated) {
      return this.prisma.customer.findMany({ where, orderBy: { businessName: 'asc' } });
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 50));
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ where, orderBy: { businessName: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.customer.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSummary(companyId: string) {
    const [total, active, totalReceivables, positiveBalances] = await Promise.all([
      this.prisma.customer.count({ where: { companyId } }),
      this.prisma.customer.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.customer.aggregate({ where: { companyId, currentBalance: { gt: 0 } }, _sum: { currentBalance: true } }),
      this.prisma.customer.findMany({ where: { companyId, currentBalance: { gt: 0 } }, select: { currentBalance: true, creditLimit: true } }),
    ]);
    return {
      total,
      active,
      inactive: total - active,
      totalReceivables: totalReceivables._sum.currentBalance || 0,
      overdue: positiveBalances.filter((c) => c.currentBalance > c.creditLimit).length,
    };
  }

  async findOne(id: string, companyId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
      include: {
        sales: { orderBy: { createdAt: 'desc' } },
        customerPayments: { orderBy: { createdAt: 'desc' } },
        customerCylinderBals: { include: { cylinderType: true } },
      },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async create(dto: CreateCustomerDto, companyId: string) {
    try {
      return await this.prisma.customer.create({
        data: { ...dto, companyId, currentBalance: dto.openingBalance || 0 },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException(`Customer code '${dto.customerCode}' already exists`);
      throw e;
    }
  }

  async update(id: string, dto: UpdateCustomerDto, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.customer.delete({ where: { id } });
  }

  async getLedger(id: string, companyId: string) {
    const customer = await this.findOne(id, companyId);
    const sales = await this.prisma.sale.findMany({ where: { customerId: id }, orderBy: { saleDate: 'asc' } });
    const payments = await this.prisma.customerPayment.findMany({ where: { customerId: id }, orderBy: { paymentDate: 'asc' } });
    const returns = await this.prisma.saleReturn.findMany({ where: { customerId: id }, orderBy: { returnDate: 'asc' } });

    // A sale's own paidAmount (collected at point-of-sale) is netted against
    // its debit immediately — only the amount actually left owing shows up
    // as a running balance impact, matching how Customer.currentBalance is
    // maintained (incremented only by each sale's remainingAmount).
    //
    // A Sale Return credits the customer for the returned value — this
    // mirrors SaleReturnsService.create(), which decrements
    // Customer.currentBalance by exactly `totalAmount` at return time. It is
    // represented here ONCE, as its own ledger row; it must never also be
    // netted into the originating sale's row (which still reflects the
    // sale exactly as it was invoiced), or the return would be counted twice.
    const entries: any[] = [
      ...sales.map((s) => ({ date: s.saleDate, description: `Invoice ${s.invoiceNumber}`, transactionType: 'SALE', debit: s.netTotal, credit: s.paidAmount, ref: s.invoiceNumber })),
      ...payments.map((p) => ({ date: p.paymentDate, description: `Payment ${p.paymentNumber}${p.reference ? ' · ' + p.reference : ''}`, transactionType: 'PAYMENT', debit: 0, credit: p.amount, ref: p.paymentNumber })),
      ...returns.map((r) => ({ date: r.returnDate, description: `Return ${r.returnNumber}${r.reason ? ' · ' + r.reason : ''}`, transactionType: 'SALE_RETURN', debit: 0, credit: r.totalAmount, ref: r.returnNumber })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = customer.openingBalance || 0;
    const rows = entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });

    return [
      { date: null, description: 'Opening Balance', transactionType: 'OPENING', debit: 0, credit: 0, ref: '—', balance: customer.openingBalance || 0 },
      ...rows,
    ];
  }
}
