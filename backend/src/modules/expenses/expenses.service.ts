import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

export interface FindAllExpensesQuery {
  search?: string;
  category?: string;
  method?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, query?: FindAllExpensesQuery) {
    const where: any = { companyId };
    if (query?.search) {
      const q = query.search;
      where.OR = [{ expenseNumber: { contains: q } }, { description: { contains: q } }];
    }
    if (query?.category && query.category !== 'ALL') where.category = query.category;
    if (query?.method && query.method !== 'ALL') where.paymentMethod = query.method;
    if (query?.from || query?.to) {
      where.expenseDate = {};
      if (query.from) where.expenseDate.gte = new Date(query.from);
      if (query.to) { const end = new Date(query.to); end.setDate(end.getDate() + 1); where.expenseDate.lt = end; }
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query?.limit) || 20));
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({ where, orderBy: { expenseDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.expense.findFirst({ where: { id, companyId } });
    if (!item) throw new NotFoundException(`Expense ${id} not found`);
    return item;
  }

  async create(dto: CreateExpenseDto, companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({ data: { ...dto, companyId, expenseDate: new Date(dto.expenseDate) } });

      const isCash = (dto.paymentMethod || 'CASH') === 'CASH';
      if (isCash) {
        const lastTx = await tx.cashTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
        const prevBalance = lastTx?.balance ?? 0;
        await tx.cashTransaction.create({
          data: {
            companyId,
            transactionType: 'EXPENSE',
            referenceId: expense.id,
            referenceType: 'Expense',
            amount: dto.amount,
            direction: 'OUT',
            balance: prevBalance - dto.amount,
            description: `Expense ${expense.expenseNumber} — ${expense.category}`,
          },
        });
      } else {
        const lastTx = await tx.bankTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
        const prevBalance = lastTx?.balance ?? 0;
        await tx.bankTransaction.create({
          data: {
            companyId,
            transactionType: 'EXPENSE',
            referenceId: expense.id,
            referenceType: 'Expense',
            amount: dto.amount,
            direction: 'OUT',
            balance: prevBalance - dto.amount,
            description: `Expense ${expense.expenseNumber} — ${expense.category}`,
          },
        });
      }

      return expense;
    });
  }

  async update(id: string, dto: UpdateExpenseDto, companyId: string) {
    const existing = await this.findOne(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      // If the amount is being corrected, apply only the delta to whichever
      // book the original entry landed in — mirrors GasReceiving's
      // quantity-correction pattern rather than reversing and recreating.
      if (dto.amount !== undefined && dto.amount !== existing.amount) {
        const delta = dto.amount - existing.amount; // positive = more cash going out
        const isCash = existing.paymentMethod === 'CASH';
        const description = `Correction to expense ${existing.expenseNumber}`;
        if (isCash) {
          const lastTx = await tx.cashTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
          const prevBalance = lastTx?.balance ?? 0;
          await tx.cashTransaction.create({
            data: {
              companyId,
              transactionType: 'ADJUSTMENT',
              referenceId: id,
              referenceType: 'Expense',
              amount: Math.abs(delta),
              direction: delta > 0 ? 'OUT' : 'IN',
              balance: prevBalance - delta,
              description,
            },
          });
        } else {
          const lastTx = await tx.bankTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
          const prevBalance = lastTx?.balance ?? 0;
          await tx.bankTransaction.create({
            data: {
              companyId,
              transactionType: 'ADJUSTMENT',
              referenceId: id,
              referenceType: 'Expense',
              amount: Math.abs(delta),
              direction: delta > 0 ? 'OUT' : 'IN',
              balance: prevBalance - delta,
              description,
            },
          });
        }
      }

      return tx.expense.update({ where: { id }, data: dto });
    });
  }

  async remove(id: string, companyId: string) {
    const existing = await this.findOne(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      // Reverse the *net* effect of the create entry plus any later
      // corrections — not just the original row — so a deleted expense
      // never leaves a stale outflow (or a partially-corrected one) behind.
      const cashEntries = await tx.cashTransaction.findMany({ where: { companyId, referenceId: id, referenceType: 'Expense' } });
      const cashNetOut = cashEntries.reduce((s, e) => s + (e.direction === 'OUT' ? e.amount : -e.amount), 0);
      if (cashNetOut !== 0) {
        const lastTx = await tx.cashTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
        const prevBalance = lastTx?.balance ?? 0;
        const direction = cashNetOut > 0 ? 'IN' : 'OUT';
        const amount = Math.abs(cashNetOut);
        await tx.cashTransaction.create({
          data: {
            companyId,
            transactionType: 'EXPENSE_DELETED',
            referenceId: id,
            referenceType: 'Expense',
            amount,
            direction,
            balance: direction === 'IN' ? prevBalance + amount : prevBalance - amount,
            description: `Reversal — expense ${existing.expenseNumber} deleted`,
          },
        });
      }

      const bankEntries = await tx.bankTransaction.findMany({ where: { companyId, referenceId: id, referenceType: 'Expense' } });
      const bankNetOut = bankEntries.reduce((s, e) => s + (e.direction === 'OUT' ? e.amount : -e.amount), 0);
      if (bankNetOut !== 0) {
        const lastTx = await tx.bankTransaction.findFirst({ where: { companyId }, orderBy: { createdAt: 'desc' } });
        const prevBalance = lastTx?.balance ?? 0;
        const direction = bankNetOut > 0 ? 'IN' : 'OUT';
        const amount = Math.abs(bankNetOut);
        await tx.bankTransaction.create({
          data: {
            companyId,
            transactionType: 'EXPENSE_DELETED',
            referenceId: id,
            referenceType: 'Expense',
            amount,
            direction,
            balance: direction === 'IN' ? prevBalance + amount : prevBalance - amount,
            description: `Reversal — expense ${existing.expenseNumber} deleted`,
          },
        });
      }

      return tx.expense.delete({ where: { id } });
    });
  }

  async getSummary(companyId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [total, todayAgg, monthAgg, allAgg, byCategory] = await Promise.all([
      this.prisma.expense.count({ where: { companyId } }),
      this.prisma.expense.aggregate({ where: { companyId, expenseDate: { gte: today, lt: tomorrow } }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { companyId, expenseDate: { gte: monthStart, lt: tomorrow } }, _sum: { amount: true } }),
      this.prisma.expense.aggregate({ where: { companyId }, _sum: { amount: true } }),
      this.prisma.expense.groupBy({ by: ['category'], where: { companyId }, _sum: { amount: true }, _count: true }),
    ]);

    const topCategory = byCategory.reduce<{ category: string; total: number } | null>((top, c) => {
      const sum = c._sum.amount || 0;
      return !top || sum > top.total ? { category: c.category, total: sum } : top;
    }, null);

    return {
      total,
      todayTotal: todayAgg._sum.amount || 0,
      monthTotal: monthAgg._sum.amount || 0,
      allTotal: allAgg._sum.amount || 0,
      topCategory,
      byCategory: byCategory.map((c) => ({ category: c.category, total: c._sum.amount || 0, count: c._count })),
    };
  }
}
