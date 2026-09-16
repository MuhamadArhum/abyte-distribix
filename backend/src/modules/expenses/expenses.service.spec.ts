import { NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

describe('ExpensesService', () => {
  const COMPANY_ID = 'cmp_default';
  let service: ExpensesService;
  let tx: any;
  let prisma: any;

  beforeEach(() => {
    tx = {
      expense: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'e1', expenseNumber: data.expenseNumber, category: data.category, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'e1', ...data })),
        delete: jest.fn().mockResolvedValue({ id: 'e1' }),
      },
      cashTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
      },
      bankTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    prisma = { $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)) };
    service = new ExpensesService(prisma as unknown as PrismaService);
  });

  const baseDto: CreateExpenseDto = {
    expenseNumber: 'EXP-001',
    category: 'FUEL',
    expenseDate: '2026-08-29',
    amount: 5000,
  };

  describe('create', () => {
    it('books a CASH expense as an OUT entry in the cash book by default', async () => {
      await service.create(baseDto, COMPANY_ID);
      expect(tx.cashTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ amount: 5000, direction: 'OUT', balance: -5000 }),
      }));
      expect(tx.bankTransaction.create).not.toHaveBeenCalled();
    });

    it('books a BANK expense in the bank book instead when paymentMethod is not CASH', async () => {
      await service.create({ ...baseDto, paymentMethod: 'BANK' }, COMPANY_ID);
      expect(tx.bankTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ amount: 5000, direction: 'OUT', balance: -5000 }),
      }));
      expect(tx.cashTransaction.create).not.toHaveBeenCalled();
    });

    it('continues the running balance from the last cash transaction rather than starting over', async () => {
      tx.cashTransaction.findFirst.mockResolvedValue({ balance: 20000 });
      await service.create(baseDto, COMPANY_ID);
      expect(tx.cashTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ balance: 15000 }),
      }));
    });

    it('stamps the server-derived companyId onto both the expense and its ledger entry', async () => {
      const expense = await service.create({ ...baseDto, companyId: 'other-company' } as any, COMPANY_ID);
      expect(expense.companyId).toBe(COMPANY_ID);
      expect(tx.cashTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ companyId: COMPANY_ID }),
      }));
    });
  });

  describe('update — amount correction applies only the delta', () => {
    const existing = { id: 'e1', expenseNumber: 'EXP-001', amount: 5000, paymentMethod: 'CASH' };

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(existing as any);
    });

    it('records an OUT adjustment when the corrected amount is higher', async () => {
      await service.update('e1', { amount: 7000 } as any, COMPANY_ID);
      expect(tx.cashTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ transactionType: 'ADJUSTMENT', amount: 2000, direction: 'OUT' }),
      }));
    });

    it('records an IN adjustment when the corrected amount is lower', async () => {
      await service.update('e1', { amount: 3000 } as any, COMPANY_ID);
      expect(tx.cashTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ transactionType: 'ADJUSTMENT', amount: 2000, direction: 'IN' }),
      }));
    });

    it('does not touch the ledger at all when the amount is unchanged', async () => {
      await service.update('e1', { description: 'typo fix' } as any, COMPANY_ID);
      expect(tx.cashTransaction.create).not.toHaveBeenCalled();
      expect(tx.bankTransaction.create).not.toHaveBeenCalled();
    });

    it('corrects into the bank book when the original expense was paid by bank, not cash', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ ...existing, paymentMethod: 'BANK' } as any);
      await service.update('e1', { amount: 8000 } as any, COMPANY_ID);
      expect(tx.bankTransaction.create).toHaveBeenCalled();
      expect(tx.cashTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('remove — net reversal of the original entry plus any corrections', () => {
    const existing = { id: 'e1', expenseNumber: 'EXP-001', amount: 5000, paymentMethod: 'CASH' };

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(existing as any);
    });

    it('reverses a simple, uncorrected cash expense with an IN entry for the full amount', async () => {
      tx.cashTransaction.findMany.mockResolvedValue([{ direction: 'OUT', amount: 5000 }]);
      await service.remove('e1', COMPANY_ID);
      expect(tx.cashTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ transactionType: 'EXPENSE_DELETED', amount: 5000, direction: 'IN' }),
      }));
    });

    it('reverses only the NET effect when the expense was corrected upward before deletion', async () => {
      // Original 5000 OUT, then a 2000 OUT correction (amount raised to 7000) — net out is 7000.
      tx.cashTransaction.findMany.mockResolvedValue([
        { direction: 'OUT', amount: 5000 },
        { direction: 'OUT', amount: 2000 },
      ]);
      await service.remove('e1', COMPANY_ID);
      expect(tx.cashTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ amount: 7000, direction: 'IN' }),
      }));
    });

    it('writes no reversal at all when the net cash effect is already zero', async () => {
      // 5000 out, then a 5000 IN correction cancels it out exactly.
      tx.cashTransaction.findMany.mockResolvedValue([
        { direction: 'OUT', amount: 5000 },
        { direction: 'IN', amount: 5000 },
      ]);
      await service.remove('e1', COMPANY_ID);
      expect(tx.cashTransaction.create).not.toHaveBeenCalled();
    });

    it('deletes the expense row itself', async () => {
      const result = await service.remove('e1', COMPANY_ID);
      expect(tx.expense.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
      expect(result).toEqual({ id: 'e1' });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the expense does not exist in this company', async () => {
      prisma.expense = { findFirst: jest.fn().mockResolvedValue(null) };
      await expect(service.findOne('missing', COMPANY_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
