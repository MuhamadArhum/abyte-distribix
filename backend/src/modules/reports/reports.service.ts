import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }
    return this.prisma.sale.findMany({
      where,
      include: { customer: true, saleItems: { include: { cylinderType: true } } },
      orderBy: { saleDate: 'desc' },
    });
  }

  async getPurchaseReport(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) where.purchaseDate.gte = new Date(startDate);
      if (endDate) where.purchaseDate.lte = new Date(endDate);
    }
    return this.prisma.purchase.findMany({
      where,
      include: { supplier: true, gasProduct: true },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  async getCustomerReceivables() {
    return this.prisma.customer.findMany({
      where: { currentBalance: { gt: 0 } },
      orderBy: { currentBalance: 'desc' },
      select: { id: true, customerCode: true, businessName: true, phone: true, currentBalance: true },
    });
  }

  async getSupplierPayables() {
    return this.prisma.supplier.findMany({
      where: { currentBalance: { gt: 0 } },
      orderBy: { currentBalance: 'desc' },
      select: { id: true, supplierCode: true, supplierName: true, phone: true, currentBalance: true },
    });
  }

  async getInventoryReport() {
    const [gasTanks, cylinders] = await Promise.all([
      this.prisma.storageTank.findMany({ include: { gasProduct: true } }),
      this.prisma.cylinderInventory.findMany({ include: { cylinderType: true } }),
    ]);
    return { gasTanks, cylinders };
  }

  async getProfitLossReport(startDate?: string, endDate?: string) {
    const mkFilter = (field: string) => {
      const f: any = {};
      if (startDate) f.gte = new Date(startDate);
      if (endDate) f.lte = new Date(endDate);
      return Object.keys(f).length ? { [field]: f } : {};
    };

    const [sales, purchases, expenses, expensesByCategory] = await Promise.all([
      this.prisma.sale.aggregate({ where: mkFilter('saleDate'), _sum: { netTotal: true, discount: true }, _count: true }),
      this.prisma.purchase.aggregate({ where: mkFilter('purchaseDate'), _sum: { netAmount: true } }),
      this.prisma.expense.aggregate({ where: mkFilter('expenseDate'), _sum: { amount: true }, _count: true }),
      this.prisma.expense.groupBy({ by: ['category'], where: mkFilter('expenseDate'), _sum: { amount: true } }),
    ]);

    const totalRevenue = sales._sum.netTotal || 0;
    const costOfGoodsSold = purchases._sum.netAmount || 0;
    const grossProfit = totalRevenue - costOfGoodsSold;
    const totalExpenses = expenses._sum.amount || 0;
    const netProfit = grossProfit - totalExpenses;

    return {
      period: { startDate, endDate },
      revenue: { total: totalRevenue, invoiceCount: sales._count, totalDiscount: sales._sum.discount || 0 },
      costOfGoodsSold,
      grossProfit,
      grossProfitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      expenses: { total: totalExpenses, count: expenses._count, byCategory: expensesByCategory },
      netProfit,
      netProfitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    };
  }

  async getCylinderMovementReport(startDate?: string, endDate?: string) {
    const mkFilter = (field: string) => {
      const f: any = {};
      if (startDate) f.gte = new Date(startDate);
      if (endDate) f.lte = new Date(endDate);
      return Object.keys(f).length ? { [field]: f } : {};
    };

    const [fillingBatches, transactions, inventory] = await Promise.all([
      this.prisma.fillingBatch.findMany({ where: mkFilter('fillingDate'), include: { cylinderType: true, tank: true }, orderBy: { fillingDate: 'desc' } }),
      this.prisma.cylinderTransaction.findMany({ where: mkFilter('createdAt'), include: { cylinderType: true, customer: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.cylinderInventory.findMany({ include: { cylinderType: true } }),
    ]);

    return { fillingBatches, transactions, inventory };
  }

  async getSalesByUserReport(startDate?: string, endDate?: string) {
    const mkFilter = (field: string) => {
      const f: any = {};
      if (startDate) f.gte = new Date(startDate);
      if (endDate) f.lte = new Date(endDate);
      return Object.keys(f).length ? { [field]: f } : {};
    };

    const salesByUser = await this.prisma.sale.groupBy({
      by: ['createdById'],
      where: mkFilter('saleDate'),
      _sum: { netTotal: true, paidAmount: true },
      _count: true,
    });

    const userIds = salesByUser.map(s => s.createdById).filter(Boolean) as string[];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, username: true } });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    return salesByUser.map(s => ({
      user: s.createdById ? (userMap[s.createdById] || { fullName: 'Unknown', username: 'N/A' }) : { fullName: 'Unknown', username: 'N/A' },
      totalSales: s._count,
      totalAmount: s._sum.netTotal || 0,
      totalCollected: s._sum.paidAmount || 0,
    }));
  }

  async getSalesReturnsReport(startDate?: string, endDate?: string) {
    const mkFilter = (field: string) => {
      const f: any = {};
      if (startDate) f.gte = new Date(startDate);
      if (endDate) f.lte = new Date(endDate);
      return Object.keys(f).length ? { [field]: f } : {};
    };

    return this.prisma.saleReturn.findMany({
      where: mkFilter('returnDate'),
      include: { sale: { include: { saleItems: { include: { cylinderType: true } } } }, customer: true },
      orderBy: { returnDate: 'desc' },
    });
  }
}
