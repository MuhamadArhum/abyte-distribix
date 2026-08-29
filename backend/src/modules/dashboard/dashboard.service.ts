import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalCustomers,
      totalSuppliers,
      todaySales,
      todayExpenses,
      totalReceivables,
      totalPayables,
      filledCylinders,
      emptyCylinders,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { status: 'ACTIVE' } }),
      this.prisma.supplier.count({ where: { status: 'ACTIVE' } }),
      this.prisma.sale.aggregate({
        where: { saleDate: { gte: today, lt: tomorrow } },
        _sum: { netTotal: true },
      }),
      this.prisma.expense.aggregate({
        where: { expenseDate: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
      this.prisma.customer.aggregate({ _sum: { currentBalance: true } }),
      this.prisma.supplier.aggregate({ _sum: { currentBalance: true } }),
      this.prisma.cylinderInventory.aggregate({
        where: { status: 'FILLED' },
        _sum: { quantity: true },
      }),
      this.prisma.cylinderInventory.aggregate({
        where: { status: 'EMPTY' },
        _sum: { quantity: true },
      }),
    ]);

    return {
      totalCustomers,
      totalSuppliers,
      todaySales: todaySales._sum.netTotal || 0,
      todayExpenses: todayExpenses._sum.amount || 0,
      totalReceivables: totalReceivables._sum.currentBalance || 0,
      totalPayables: totalPayables._sum.currentBalance || 0,
      filledCylinders: filledCylinders._sum.quantity || 0,
      emptyCylinders: emptyCylinders._sum.quantity || 0,
    };
  }

  async getSalesChart() {
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
          where: { saleDate: { gte: date, lt: next } },
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
