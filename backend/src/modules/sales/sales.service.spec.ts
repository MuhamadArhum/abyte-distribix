import { SalesService } from './sales.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';

describe('SalesService.create', () => {
  let service: SalesService;
  let prisma: { sale: { create: jest.Mock }; customer: { update: jest.Mock } };

  beforeEach(() => {
    prisma = {
      sale: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 's1', ...data })) },
      customer: { update: jest.fn().mockResolvedValue({}) },
    };
    service = new SalesService(prisma as unknown as PrismaService);
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
    const sale = await service.create(dto);

    // 10 x 3500 = 35000 subtotal; 35000 - 1000 invoice discount = 34000 net (matches SRS worked example)
    expect(sale.subtotal).toBe(35000);
    expect(sale.netTotal).toBe(34000);
    expect((sale.saleItems as any).create[0].totalPrice).toBe(35000);
  });

  it('marks the sale UNPAID and adds the full amount to customer balance when nothing is paid', async () => {
    const sale = await service.create(baseDto);
    expect(sale.paymentStatus).toBe('UNPAID');
    expect(sale.remainingAmount).toBe(35000);
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { currentBalance: { increment: 35000 } },
    });
  });

  it('marks the sale PARTIAL when a partial payment is made', async () => {
    const sale = await service.create({ ...baseDto, paidAmount: 15000 });
    expect(sale.paymentStatus).toBe('PARTIAL');
    expect(sale.remainingAmount).toBe(20000);
  });

  it('marks the sale PAID and does not touch customer balance when fully paid', async () => {
    const sale = await service.create({ ...baseDto, paidAmount: 35000 });
    expect(sale.paymentStatus).toBe('PAID');
    expect(sale.remainingAmount).toBe(0);
    expect(prisma.customer.update).not.toHaveBeenCalled();
  });

  it('subtracts per-item discounts before summing the subtotal', async () => {
    const dto: CreateSaleDto = {
      ...baseDto,
      items: [
        { cylinderTypeId: 't1', quantity: 10, unitPrice: 3500, discount: 500 },
        { cylinderTypeId: 't2', quantity: 5, unitPrice: 3300, discount: 0 },
      ],
    };
    const sale = await service.create(dto);
    // (10*3500 - 500) + (5*3300 - 0) = 34500 + 16500 = 51000
    expect(sale.subtotal).toBe(51000);
  });
});
