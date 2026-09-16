import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * `endDate` must include the WHOLE calendar day, not just its midnight
   * instant — otherwise a single-day range (startDate === endDate, the most
   * common report request) silently excludes every record from that day.
   */
  private dateRangeFilter(field: string, startDate?: string, endDate?: string) {
    const f: any = {};
    if (startDate) f.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      f.lte = end;
    }
    return Object.keys(f).length ? { [field]: f } : {};
  }

  async getSalesReport(companyId: string, startDate?: string, endDate?: string) {
    return this.prisma.sale.findMany({
      where: { companyId, ...this.dateRangeFilter('saleDate', startDate, endDate) },
      include: { customer: true, saleItems: { include: { cylinderType: true } } },
      orderBy: { saleDate: 'desc' },
    });
  }

  async getPurchaseReport(companyId: string, startDate?: string, endDate?: string) {
    return this.prisma.purchase.findMany({
      where: { companyId, ...this.dateRangeFilter('purchaseDate', startDate, endDate) },
      include: { supplier: true, gasProduct: true },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  async getCustomerReceivables(companyId: string) {
    return this.prisma.customer.findMany({
      where: { companyId, currentBalance: { gt: 0 } },
      orderBy: { currentBalance: 'desc' },
      select: { id: true, customerCode: true, businessName: true, phone: true, currentBalance: true },
    });
  }

  async getSupplierPayables(companyId: string) {
    return this.prisma.supplier.findMany({
      where: { companyId, currentBalance: { gt: 0 } },
      orderBy: { currentBalance: 'desc' },
      select: { id: true, supplierCode: true, supplierName: true, phone: true, currentBalance: true },
    });
  }

  async getInventoryReport(companyId: string) {
    const [gasTanks, cylinders] = await Promise.all([
      this.prisma.storageTank.findMany({ where: { companyId }, include: { gasProduct: true } }),
      this.prisma.cylinderInventory.findMany({ where: { companyId }, include: { cylinderType: true } }),
    ]);
    return { gasTanks, cylinders };
  }

  /**
   * Cost of Goods Sold cannot be "purchases made in this period" — that
   * conflates cash-basis purchase spend with the cost of units actually
   * sold, and produces nonsensical results whenever purchase and sale
   * volume aren't matched 1:1 in the window (the normal case for any
   * business that stocks up before selling). There's no per-unit cost
   * field on SaleItem/CylinderType, so this uses a weighted-average cost
   * per KG across all-time purchases, applied to the KG of gas actually
   * sold (via each cylinder type's gasCapacity) in the requested period.
   *
   * Revenue is net of Sales Returns processed in the period — a return
   * reverses recognized revenue, matching accrual accounting practice.
   */
  async computeProfitLoss(companyId: string, startDate?: string, endDate?: string) {
    const [sales, expenses, expensesByCategory, purchaseAgg, saleItemsInPeriod, returnsAgg] = await Promise.all([
      this.prisma.sale.aggregate({ where: { companyId, ...this.dateRangeFilter('saleDate', startDate, endDate) }, _sum: { netTotal: true, discount: true }, _count: true }),
      this.prisma.expense.aggregate({ where: { companyId, ...this.dateRangeFilter('expenseDate', startDate, endDate) }, _sum: { amount: true }, _count: true }),
      this.prisma.expense.groupBy({ by: ['category'], where: { companyId, ...this.dateRangeFilter('expenseDate', startDate, endDate) }, _sum: { amount: true } }),
      this.prisma.purchase.aggregate({ where: { companyId }, _sum: { quantity: true, netAmount: true } }), // all-time cost basis, not period-scoped
      this.prisma.saleItem.findMany({
        where: { companyId, ...(startDate || endDate ? { sale: this.dateRangeFilter('saleDate', startDate, endDate) } : {}) },
        include: { cylinderType: true },
      }),
      this.prisma.saleReturn.aggregate({ where: { companyId, ...this.dateRangeFilter('returnDate', startDate, endDate) }, _sum: { totalAmount: true }, _count: true }),
    ]);

    const grossRevenue = sales._sum.netTotal || 0;
    const totalReturns = returnsAgg._sum.totalAmount || 0;
    const totalRevenue = grossRevenue - totalReturns;
    const totalExpenses = expenses._sum.amount || 0;

    const totalPurchasedQty = purchaseAgg._sum.quantity || 0;
    const totalPurchasedCost = purchaseAgg._sum.netAmount || 0;
    const avgCostPerKg = totalPurchasedQty > 0 ? totalPurchasedCost / totalPurchasedQty : 0;
    const kgSold = saleItemsInPeriod.reduce((sum, si) => sum + si.quantity * (si.cylinderType?.gasCapacity || 0), 0);
    const costOfGoodsSold = Math.round(kgSold * avgCostPerKg * 100) / 100;

    const grossProfit = totalRevenue - costOfGoodsSold;
    const netProfit = grossProfit - totalExpenses;

    return {
      period: { startDate, endDate },
      revenue: { total: totalRevenue, gross: grossRevenue, returns: totalReturns, returnCount: returnsAgg._count, invoiceCount: sales._count, totalDiscount: sales._sum.discount || 0 },
      costOfGoodsSold,
      costOfGoodsSoldMethodology: 'weighted-average purchase cost per KG (all-time) × KG of gas sold in period',
      avgCostPerKg,
      kgSold,
      grossProfit,
      grossProfitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      expenses: { total: totalExpenses, count: expenses._count, byCategory: expensesByCategory },
      netProfit,
      netProfitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    };
  }

  async getProfitLossReport(companyId: string, startDate?: string, endDate?: string) {
    return this.computeProfitLoss(companyId, startDate, endDate);
  }

  async getCylinderMovementReport(companyId: string, startDate?: string, endDate?: string) {
    const [fillingBatches, transactions, inventory] = await Promise.all([
      this.prisma.fillingBatch.findMany({ where: { companyId, ...this.dateRangeFilter('fillingDate', startDate, endDate) }, include: { cylinderType: true, tank: true }, orderBy: { fillingDate: 'desc' } }),
      this.prisma.cylinderTransaction.findMany({ where: { companyId, ...this.dateRangeFilter('createdAt', startDate, endDate) }, include: { cylinderType: true, customer: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.cylinderInventory.findMany({ where: { companyId }, include: { cylinderType: true } }),
    ]);

    return { fillingBatches, transactions, inventory };
  }

  async getSalesByUserReport(companyId: string, startDate?: string, endDate?: string) {
    const salesByUser = await this.prisma.sale.groupBy({
      by: ['createdById'],
      where: { companyId, ...this.dateRangeFilter('saleDate', startDate, endDate) },
      _sum: { netTotal: true, paidAmount: true },
      _count: true,
    });

    const userIds = salesByUser.map(s => s.createdById).filter(Boolean) as string[];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds }, companyId }, select: { id: true, fullName: true, username: true } });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    return salesByUser.map(s => ({
      user: s.createdById ? (userMap[s.createdById] || { fullName: 'Unknown', username: 'N/A' }) : { fullName: 'Unknown', username: 'N/A' },
      totalSales: s._count,
      totalAmount: s._sum.netTotal || 0,
      totalCollected: s._sum.paidAmount || 0,
    }));
  }

  async getSalesReturnsReport(companyId: string, startDate?: string, endDate?: string) {
    return this.prisma.saleReturn.findMany({
      where: { companyId, ...this.dateRangeFilter('returnDate', startDate, endDate) },
      include: { sale: { include: { saleItems: { include: { cylinderType: true } } } }, customer: true },
      orderBy: { returnDate: 'desc' },
    });
  }
}
