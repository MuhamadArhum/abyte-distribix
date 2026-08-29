import { Injectable, NotFoundException } from '@nestjs/common';
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

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { ...dto, currentBalance: dto.openingBalance || 0 },
    });
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
    return { sales, payments };
  }
}
