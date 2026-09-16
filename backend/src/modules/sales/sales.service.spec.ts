import { SalesService } from './sales.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateSaleDto } from './dto/create-sale.dto';

describe('SalesService.create', () => {
  const COMPANY_ID = 'cmp_default';
  let service: SalesService;
  let tx: any;
  let prisma: any;
  let auditLogs: { log: jest.Mock };

  beforeEach(() => {
    tx = {
      cylinderInventory: {
        findUnique: jest.fn().mockResolvedValue({ quantity: 1000 }),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      cylinderType: { findUnique: jest.fn().mockResolvedValue({ cylinderSize: '45 KG' }) },
      cylinderTransaction: { create: jest.fn().mockResolvedValue({}) },
      sale: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 's1', customer: { businessName: 'Test Co' }, ...data })),
      },
      customer: { update: jest.fn().mockResolvedValue({}) },
      cashTransaction: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
      bankTransaction: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)) };
    auditLogs = { log: jest.fn().mockResolvedValue({}) };
    service = new SalesService(prisma as unknown as PrismaService, auditLogs as unknown as AuditLogsService);
  });

  const baseDto: CreateSaleDto = {
    invoiceNumber: 'INV-001',
    customerId: 'c1',
    saleDate: '2026-08-29',
    items: [
      { cylinderTypeId: 't1', quantity: 10, unitPrice: 3500, discount: 0 },
    ],
  };

  it('computes subtotal, net total and per-item totals from quantity/price/discount', async () => {
    const dto = { ...baseDto, discount: 1000 };
    const sale = await service.create(dto, COMPANY_ID);

    // 10 x 3500 = 35000 subtotal; 35000 - 1000 invoice discount = 34000 net (matches SRS worked example)
    expect(sale.subtotal).toBe(35000);
    expect(sale.netTotal).toBe(34000);
    expect((sale.saleItems as any).create[0].totalPrice).toBe(35000);
  });

  it('marks the sale UNPAID and adds the full amount to customer balance when nothing is paid', async () => {
    const sale = await service.create(baseDto, COMPANY_ID);
    expect(sale.paymentStatus).toBe('UNPAID');
    expect(sale.remainingAmount).toBe(35000);
    expect(tx.customer.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { currentBalance: { increment: 35000 } },
    });
  });

  it('marks the sale PARTIAL when a partial payment is made', async () => {
    const sale = await service.create({ ...baseDto, paidAmount: 15000 }, COMPANY_ID);
    expect(sale.paymentStatus).toBe('PARTIAL');
    expect(sale.remainingAmount).toBe(20000);
  });

  it('marks the sale PAID and does not touch customer balance when fully paid', async () => {
    const sale = await service.create({ ...baseDto, paidAmount: 35000 }, COMPANY_ID);
    expect(sale.paymentStatus).toBe('PAID');
    expect(sale.remainingAmount).toBe(0);
    expect(tx.customer.update).not.toHaveBeenCalled();
  });

  it('subtracts per-item discounts before summing the subtotal', async () => {
    const dto: CreateSaleDto = {
      ...baseDto,
      items: [
        { cylinderTypeId: 't1', quantity: 10, unitPrice: 3500, discount: 500 },
        { cylinderTypeId: 't2', quantity: 5, unitPrice: 3300, discount: 0 },
      ],
    };
    const sale = await service.create(dto, COMPANY_ID);
    // (10*3500 - 500) + (5*3300 - 0) = 34500 + 16500 = 51000
    expect(sale.subtotal).toBe(51000);
  });

  it('decrements FILLED cylinder inventory by the quantity sold', async () => {
    await service.create(baseDto, COMPANY_ID);
    expect(tx.cylinderInventory.update).toHaveBeenCalledWith({
      where: { cylinderTypeId_status: { cylinderTypeId: 't1', status: 'FILLED' } },
      data: { quantity: { decrement: 10 } },
    });
  });

  it('rejects the sale when FILLED stock is insufficient', async () => {
    tx.cylinderInventory.findUnique.mockResolvedValueOnce({ quantity: 3 });
    await expect(service.create(baseDto, COMPANY_ID)).rejects.toThrow(/Insufficient filled stock/);
  });

  it('writes an audit log entry after a successful sale', async () => {
    const sale = await service.create(baseDto, COMPANY_ID);
    expect(auditLogs.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', module: 'Sales', recordId: sale.id }));
  });
});
