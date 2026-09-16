import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class AccountingService {
  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {}

  /** `endDate` is a date-only string (e.g. "2026-09-16") — treating it as
   * `lte` would parse to that day's midnight and silently exclude every
   * transaction from later the same day. Bumping to the start of the next
   * day with `lt` keeps the whole end date inclusive. */
  private dateRangeWhere(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;
    const where: any = {};
    if (startDate) where.gte = new Date(startDate);
    if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); where.lt = end; }
    return where;
  }

  async getCashBook(companyId: string, startDate?: string, endDate?: string, page?: number, limit?: number) {
    const dateFilter = this.dateRangeWhere(startDate, endDate);
    const where: any = { companyId, ...(dateFilter ? { createdAt: dateFilter } : {}) };

    if (page === undefined) {
      return this.prisma.cashTransaction.findMany({ where, orderBy: { createdAt: 'desc' } });
    }
    const take = Math.min(Math.max(limit || 20, 1), 200);
    const currentPage = Math.max(page, 1);
    const [data, total] = await Promise.all([
      this.prisma.cashTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (currentPage - 1) * take, take }),
      this.prisma.cashTransaction.count({ where }),
    ]);
    return { data, total, page: currentPage, limit: take };
  }

  async getBankBook(companyId: string, startDate?: string, endDate?: string, page?: number, limit?: number) {
    const dateFilter = this.dateRangeWhere(startDate, endDate);
    const where: any = { companyId, ...(dateFilter ? { createdAt: dateFilter } : {}) };

    if (page === undefined) {
      return this.prisma.bankTransaction.findMany({ where, orderBy: { createdAt: 'desc' } });
    }
    const take = Math.min(Math.max(limit || 20, 1), 200);
    const currentPage = Math.max(page, 1);
    const [data, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (currentPage - 1) * take, take }),
      this.prisma.bankTransaction.count({ where }),
    ]);
    return { data, total, page: currentPage, limit: take };
  }

  /**
   * Delegates to ReportsService's Profit & Loss calculation so the
   * Accounting page and the Reports page can never show two different
   * profit figures for the same period again (they previously used two
   * independent, contradictory formulas).
   */
  async getProfitLoss(companyId: string, startDate?: string, endDate?: string) {
    const pl = await this.reportsService.computeProfitLoss(companyId, startDate, endDate);
    return {
      revenue: pl.revenue.total,
      costOfGoodsSold: pl.costOfGoodsSold,
      costOfGoodsSoldMethodology: pl.costOfGoodsSoldMethodology,
      expenses: pl.expenses.total,
      grossProfit: pl.grossProfit,
      netProfit: pl.netProfit,
      period: pl.period,
    };
  }
}
