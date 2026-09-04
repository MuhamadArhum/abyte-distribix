import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerPaymentDto, CreateSupplierPaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // Customer Payments
  findAllCustomerPayments() {
    return this.prisma.customerPayment.findMany({
      include: { customer: true },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findOneCustomerPayment(id: string) {
    const item = await this.prisma.customerPayment.findUnique({ where: { id }, include: { customer: true, sale: true } });
    if (!item) throw new NotFoundException(`CustomerPayment ${id} not found`);
    return item;
  }

  async createCustomerPayment(dto: CreateCustomerPaymentDto) {
    const payment = await this.prisma.customerPayment.create({
      data: { ...dto, paymentDate: new Date(dto.paymentDate) },
      include: { customer: true },
    });
    // Reduce customer balance
    await this.prisma.customer.update({
      where: { id: dto.customerId },
      data: { currentBalance: { decrement: dto.amount } },
    });
    // Record in cash book
    const lastTx = await this.prisma.cashTransaction.findFirst({ orderBy: { createdAt: 'desc' } });
    const prevBalance = lastTx?.balance ?? 0;
    await this.prisma.cashTransaction.create({
      data: {
        transactionType: 'CUSTOMER_PAYMENT',
        referenceId: payment.id,
        referenceType: 'CustomerPayment',
        amount: dto.amount,
        direction: 'IN',
        balance: prevBalance + dto.amount,
        description: `Payment from ${payment.customer?.businessName || dto.customerId} · ${payment.paymentNumber}`,
      },
    });
    return payment;
  }

  // Supplier Payments
  findAllSupplierPayments() {
    return this.prisma.supplierPayment.findMany({
      include: { supplier: true },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async findOneSupplierPayment(id: string) {
    const item = await this.prisma.supplierPayment.findUnique({ where: { id }, include: { supplier: true, purchase: true } });
    if (!item) throw new NotFoundException(`SupplierPayment ${id} not found`);
    return item;
  }

  async createSupplierPayment(dto: CreateSupplierPaymentDto) {
    const payment = await this.prisma.supplierPayment.create({
      data: { ...dto, paymentDate: new Date(dto.paymentDate) },
      include: { supplier: true },
    });
    // Reduce supplier balance
    await this.prisma.supplier.update({
      where: { id: dto.supplierId },
      data: { currentBalance: { decrement: dto.amount } },
    });
    // Record in cash book as outflow
    const lastTx = await this.prisma.cashTransaction.findFirst({ orderBy: { createdAt: 'desc' } });
    const prevBalance = lastTx?.balance ?? 0;
    await this.prisma.cashTransaction.create({
      data: {
        transactionType: 'SUPPLIER_PAYMENT',
        referenceId: payment.id,
        referenceType: 'SupplierPayment',
        amount: dto.amount,
        direction: 'OUT',
        balance: prevBalance - dto.amount,
        description: `Payment to ${payment.supplier?.supplierName || dto.supplierId} · ${payment.paymentNumber}`,
      },
    });
    return payment;
  }
}
