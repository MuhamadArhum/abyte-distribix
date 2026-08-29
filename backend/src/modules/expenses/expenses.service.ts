import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.expense.findMany({ orderBy: { expenseDate: 'desc' } });
  }

  async findOne(id: string) {
    const item = await this.prisma.expense.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Expense ${id} not found`);
    return item;
  }

  create(dto: CreateExpenseDto) {
    return this.prisma.expense.create({ data: { ...dto, expenseDate: new Date(dto.expenseDate) } });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    await this.findOne(id);
    return this.prisma.expense.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.expense.delete({ where: { id } });
  }

  async getSummary() {
    const result = await this.prisma.expense.groupBy({
      by: ['category'],
      _sum: { amount: true },
      _count: true,
    });
    return result;
  }
}
