import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  findAll() { return this.prisma.supplier.findMany({ orderBy: { supplierName: 'asc' } }); }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { purchases: { take: 10, orderBy: { createdAt: 'desc' } }, supplierPayments: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return supplier;
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { ...dto, currentBalance: dto.openingBalance || 0 } });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.delete({ where: { id } });
  }

  async getLedger(id: string) {
    await this.findOne(id);
    const purchases = await this.prisma.purchase.findMany({ where: { supplierId: id }, orderBy: { purchaseDate: 'asc' } });
    const payments = await this.prisma.supplierPayment.findMany({ where: { supplierId: id }, orderBy: { paymentDate: 'asc' } });

    const entries: any[] = [
      ...purchases.map((p) => ({ date: p.purchaseDate, description: `Purchase ${p.purchaseNumber}`, transactionType: 'PURCHASE', debit: p.netAmount, credit: 0, ref: p.purchaseNumber })),
      ...payments.map((p) => ({ date: p.paymentDate, description: `Payment ${p.paymentNumber}${p.reference ? ' · ' + p.reference : ''}`, transactionType: 'PAYMENT', debit: 0, credit: p.amount, ref: p.paymentNumber })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    return entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
  }
}
