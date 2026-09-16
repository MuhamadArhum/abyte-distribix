import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private addDays(d: Date, n: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  /** Resolves a named/custom range into [start,end) plus the equal-length
   * immediately-preceding period used for the trend comparison. */
  private resolveRange(range?: string, from?: string, to?: string) {
    const today = this.startOfDay(new Date());
    let start: Date;
    let end: Date;
    let label: string;

    if (range === 'custom' && from) {
      start = this.startOfDay(new Date(from));
      end = this.addDays(this.startOfDay(new Date(to || from)), 1);
      label = 'Selected Period';
    } else if (range === 'week') {
      start = this.addDays(today, -6);
      end = this.addDays(today, 1);
      label = 'This Week';
    } else if (range === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = this.addDays(today, 1);
      label = 'This Month';
    } else {
      start = today;
      end = this.addDays(today, 1);
      label = 'Today';
    }

    const duration = end.getTime() - start.getTime();
    const prevEnd = start;
    const prevStart = new Date(start.getTime() - duration);

    return { start, end, prevStart, prevEnd, label };
  }

  private pctChange(curr: number, prev: number) {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  }

  async getStats(companyId: string, range?: string, from?: string, to?: string) {
    const { start, end, prevStart, prevEnd, label } = this.resolveRange(range, from, to);

    const [
      totalCustomers,
      totalSuppliers,
      periodSales,
      prevPeriodSales,
      periodExpenses,
      prevPeriodExpenses,
      periodReturns,
      totalReceivables,
      totalPayables,
      filledCylinders,
      emptyCylinders,
      cylindersWithCustomers,
      bulkGasStock,
      activeTanks,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.supplier.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.sale.aggregate({
        where: { companyId, saleDate: { gte: start, lt: end } },
        _sum: { netTotal: true },
      }),
      this.prisma.sale.aggregate({
        where: { companyId, saleDate: { gte: prevStart, lt: prevEnd } },
        _sum: { netTotal: true },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, expenseDate: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, expenseDate: { gte: prevStart, lt: prevEnd } },
        _sum: { amount: true },
      }),
      this.prisma.saleReturn.aggregate({
        where: { companyId, returnDate: { gte: start, lt: end } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Only positive balances count as "owed to us" / "owed by us" — a
      // matches Reports' getCustomerReceivables()/getSupplierPayables(),
      // which already filter the same way; netting credit balances against
      // debit ones here previously made the two screens permanently disagree.
      this.prisma.customer.aggregate({ where: { companyId, currentBalance: { gt: 0 } }, _sum: { currentBalance: true } }),
      this.prisma.supplier.aggregate({ where: { companyId, currentBalance: { gt: 0 } }, _sum: { currentBalance: true } }),
      this.prisma.cylinderInventory.aggregate({
        where: { companyId, status: 'FILLED' },
        _sum: { quantity: true },
      }),
      this.prisma.cylinderInventory.aggregate({
        where: { companyId, status: 'EMPTY' },
        _sum: { quantity: true },
      }),
      this.prisma.cylinderInventory.aggregate({
        where: { companyId, status: 'WITH_CUSTOMER' },
        _sum: { quantity: true },
      }),
      this.prisma.storageTank.aggregate({
        where: { companyId, status: 'ACTIVE' },
        _sum: { currentQuantity: true },
      }),
      this.prisma.storageTank.count({ where: { companyId, status: 'ACTIVE' } }),
    ]);

    const periodSalesTotal = periodSales._sum.netTotal || 0;
    const prevPeriodSalesTotal = prevPeriodSales._sum.netTotal || 0;
    const periodExpensesTotal = periodExpenses._sum.amount || 0;
    const prevPeriodExpensesTotal = prevPeriodExpenses._sum.amount || 0;
    const periodReturnsTotal = periodReturns._sum.totalAmount || 0;

    return {
      rangeLabel: label,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),

      totalCustomers,
      totalSuppliers,

      todaySales: periodSalesTotal,
      todaySalesChangePct: this.pctChange(periodSalesTotal, prevPeriodSalesTotal),
      todayExpenses: periodExpensesTotal,
      todayExpensesChangePct: this.pctChange(periodExpensesTotal, prevPeriodExpensesTotal),

      periodReturnsAmount: periodReturnsTotal,
      periodReturnsCount: periodReturns._count,
      periodReturnRatePct: periodSalesTotal > 0 ? Math.round((periodReturnsTotal / periodSalesTotal) * 1000) / 10 : 0,

      totalReceivables: totalReceivables._sum.currentBalance || 0,
      totalPayables: totalPayables._sum.currentBalance || 0,
      filledCylinders: filledCylinders._sum.quantity || 0,
      emptyCylinders: emptyCylinders._sum.quantity || 0,
      cylindersWithCustomers: cylindersWithCustomers._sum.quantity || 0,
      bulkGasStock: bulkGasStock._sum.currentQuantity || 0,
      activeTanks,
    };
  }

  async getRecentSales(companyId: string) {
    return this.prisma.sale.findMany({
      take: 5,
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { businessName: true } } },
    });
  }

  async getPendingPurchases(companyId: string) {
    return this.prisma.purchase.findMany({
      take: 5,
      where: { companyId, paymentStatus: { not: 'PAID' } },
      orderBy: { purchaseDate: 'desc' },
      include: { supplier: { select: { supplierName: true } } },
    });
  }

  async getTopDebtors(companyId: string) {
    return this.prisma.customer.findMany({
      take: 5,
      where: { companyId, currentBalance: { gt: 0 } },
      orderBy: { currentBalance: 'desc' },
      select: { id: true, businessName: true, customerType: true, currentBalance: true, creditLimit: true },
    });
  }

  async getSalesChart(companyId: string) {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    const data = await Promise.all(
      last7Days.map(async (date) => {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        const result = await this.prisma.sale.aggregate({
          where: { companyId, saleDate: { gte: date, lt: next } },
          _sum: { netTotal: true },
        });
        return {
          date: date.toISOString().split('T')[0],
          amount: result._sum.netTotal || 0,
        };
      }),
    );
    return data;
  }
}
