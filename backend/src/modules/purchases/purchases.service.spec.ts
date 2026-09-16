import { NotFoundException } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

describe('PurchasesService', () => {
  const COMPANY_ID = 'cmp_default';
  let service: PurchasesService;
  let tx: any;
  let prisma: any;
  let auditLogs: { log: jest.Mock };

  beforeEach(() => {
    tx = {
      purchase: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'p1', supplier: { supplierName: 'Test Supplier' }, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'p1', ...data })),
        delete: jest.fn().mockResolvedValue({ id: 'p1' }),
      },
      supplier: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma = { $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)) };
    auditLogs = { log: jest.fn().mockResolvedValue({}) };
    service = new PurchasesService(prisma as unknown as PrismaService, auditLogs as unknown as AuditLogsService);
  });

  const baseDto: CreatePurchaseDto = {
    purchaseNumber: 'PUR-001',
    supplierId: 's1',
    gasProductId: 'gp1',
    purchaseDate: '2026-08-29',
    quantity: 1000,
    purchaseRate: 200,
  };

  describe('create', () => {
    it('computes gasAmount/grossAmount/netAmount from quantity, rate, transport and charges', async () => {
      const dto = { ...baseDto, transportation: 5000, otherCharges: 1000, discount: 500 };
      const purchase = await service.create(dto, COMPANY_ID);
      // 1000 * 200 = 200000 gas amount; +5000 +1000 = 206000 gross; -500 discount = 205500 net
      expect(purchase.gasAmount).toBe(200000);
      expect(purchase.grossAmount).toBe(206000);
      expect(purchase.netAmount).toBe(205500);
      expect(purchase.remainingAmount).toBe(205500);
    });

    it('always starts a new purchase as UNPAID regardless of input', async () => {
      const purchase = await service.create(baseDto, COMPANY_ID);
      expect(purchase.paymentStatus).toBe('UNPAID');
    });

    it('increases the supplier balance by the full net amount owed', async () => {
      await service.create(baseDto, COMPANY_ID);
      expect(tx.supplier.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { currentBalance: { increment: 200000 } },
      });
    });

    it('does not touch the supplier balance when net amount is zero or negative', async () => {
      await service.create({ ...baseDto, quantity: 1, purchaseRate: 0.01, discount: 1000 }, COMPANY_ID);
      expect(tx.supplier.update).not.toHaveBeenCalled();
    });

    it('stamps the server-derived companyId, ignoring anything the caller passed', async () => {
      const purchase = await service.create({ ...baseDto, companyId: 'someone-elses-company' } as any, COMPANY_ID);
      expect(purchase.companyId).toBe(COMPANY_ID);
    });

    it('writes a CREATE audit log entry', async () => {
      const purchase = await service.create(baseDto, COMPANY_ID, 'user1');
      expect(auditLogs.log).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user1', action: 'CREATE', module: 'Purchases', recordId: purchase.id,
      }));
    });
  });

  describe('update — payment status derivation (SRS: UNPAID/PARTIAL/PAID)', () => {
    const existing = { id: 'p1', supplierId: 's1', netAmount: 100000, paidAmount: 0, remainingAmount: 100000 };

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(existing as any);
    });

    it('marks PAID when paidAmount fully covers netAmount', async () => {
      await service.update('p1', { paidAmount: 100000 } as any, COMPANY_ID);
      expect(tx.purchase.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({ paidAmount: 100000, remainingAmount: 0, paymentStatus: 'PAID' }),
      });
    });

    it('marks PARTIAL when some but not all is paid', async () => {
      await service.update('p1', { paidAmount: 40000 } as any, COMPANY_ID);
      expect(tx.purchase.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({ paidAmount: 40000, remainingAmount: 60000, paymentStatus: 'PARTIAL' }),
      });
    });

    it('keeps UNPAID when nothing has been paid', async () => {
      await service.update('p1', {} as any, COMPANY_ID);
      expect(tx.purchase.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({ paidAmount: 0, remainingAmount: 100000, paymentStatus: 'UNPAID' }),
      });
    });

    it('adjusts the supplier balance by only the delta, not the full new remaining amount', async () => {
      await service.update('p1', { paidAmount: 40000 } as any, COMPANY_ID);
      // remaining went from 100000 -> 60000, a delta of -40000
      expect(tx.supplier.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { currentBalance: { increment: -40000 } },
      });
    });

    it('does not touch the supplier balance when the remaining amount is unchanged', async () => {
      await service.update('p1', { notes: 'just a note' } as any, COMPANY_ID);
      expect(tx.supplier.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const existing = { id: 'p1', supplierId: 's1', purchaseNumber: 'PUR-001', netAmount: 100000, remainingAmount: 60000 };

    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(existing as any);
    });

    it('reverses the outstanding balance impact on the supplier', async () => {
      await service.remove('p1', COMPANY_ID, 'user1');
      expect(tx.supplier.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { currentBalance: { decrement: 60000 } },
      });
    });

    it('skips the supplier update when the purchase was already fully paid (zero remaining)', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ ...existing, remainingAmount: 0 } as any);
      await service.remove('p1', COMPANY_ID);
      expect(tx.supplier.update).not.toHaveBeenCalled();
    });

    it('writes a DELETE audit log entry', async () => {
      await service.remove('p1', COMPANY_ID, 'user1');
      expect(auditLogs.log).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user1', action: 'DELETE', module: 'Purchases', recordId: 'p1',
      }));
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the purchase does not exist in this company', async () => {
      prisma.purchase = { findFirst: jest.fn().mockResolvedValue(null) };
      await expect(service.findOne('missing', COMPANY_ID)).rejects.toThrow(NotFoundException);
    });

    it('scopes the lookup by both id and companyId', async () => {
      prisma.purchase = { findFirst: jest.fn().mockResolvedValue({ id: 'p1', companyId: COMPANY_ID }) };
      await service.findOne('p1', COMPANY_ID);
      expect(prisma.purchase.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'p1', companyId: COMPANY_ID },
      }));
    });
  });
});
