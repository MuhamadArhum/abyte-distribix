import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany({ orderBy: { businessName: 'asc' } });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        sales: { take: 10, orderBy: { createdAt: 'desc' } },
        customerPayments: { take: 10, orderBy: { createdAt: 'desc' } },
        customerCylinderBals: { include: { cylinderType: true } },
      },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({
        data: { ...dto, currentBalance: dto.openingBalance || 0 },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException(`Customer code '${dto.customerCode}' already exists`);
      throw e;
    }
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({ where: { id } });
  }

  async getLedger(id: string) {
    await this.findOne(id);
    const sales = await this.prisma.sale.findMany({ where: { customerId: id }, orderBy: { saleDate: 'asc' } });
    const payments = await this.prisma.customerPayment.findMany({ where: { customerId: id }, orderBy: { paymentDate: 'asc' } });

    const entries: any[] = [
      ...sales.map((s) => ({ date: s.saleDate, description: `Invoice ${s.invoiceNumber}`, transactionType: 'SALE', debit: s.netTotal, credit: 0, ref: s.invoiceNumber })),
      ...payments.map((p) => ({ date: p.paymentDate, description: `Payment ${p.paymentNumber}${p.reference ? ' · ' + p.reference : ''}`, transactionType: 'PAYMENT', debit: 0, credit: p.amount, ref: p.paymentNumber })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    return entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
  }
}
