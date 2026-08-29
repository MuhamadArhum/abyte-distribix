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
}
