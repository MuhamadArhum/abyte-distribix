import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async getCashBook(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    return this.prisma.cashTransaction.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getBankBook(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate) where.createdAt = { gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    return this.prisma.bankTransaction.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getProfitLoss(startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const salesRevenue = await this.prisma.sale.aggregate({
      where: startDate || endDate ? { saleDate: dateFilter } : undefined,
      _sum: { netTotal: true },
    });

    const totalExpenses = await this.prisma.expense.aggregate({
      where: startDate || endDate ? { expenseDate: dateFilter } : undefined,
      _sum: { amount: true },
    });

    const revenue = salesRevenue._sum.netTotal || 0;
    const expenses = totalExpenses._sum.amount || 0;

    return {
      revenue,
      expenses,
      grossProfit: revenue - expenses,
      period: { startDate, endDate },
    };
  }
}
