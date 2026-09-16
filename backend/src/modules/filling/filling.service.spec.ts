import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FillingService } from './filling.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FillingService', () => {
  const COMPANY_ID = 'cmp_default';
  let service: FillingService;
  let tx: any;
  let prisma: any;

  beforeEach(() => {
    tx = {
      fillingBatch: { update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)) },
      storageTank: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tank1', tankName: 'Tank 1', currentQuantity: 1000, capacity: 5000, gasProductId: 'gp1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      cylinderInventory: {
        findUnique: jest.fn().mockResolvedValue({ quantity: 500 }),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      gasInventoryTransaction: { create: jest.fn().mockResolvedValue({}) },
      cylinderTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)) };
    service = new FillingService(prisma as unknown as PrismaService);
    jest.spyOn(service, 'findOne');
  });

  describe('update — variance math (SRS Section 17)', () => {
    it('computes gas variance as actual minus expected', async () => {
      (service.findOne as jest.Mock).mockResolvedValue({ id: 'b1', expectedGasQty: 1180, status: 'PENDING', tankId: 'tank1', cylinderTypeId: 'ct1', numberOfCylinders: 100, batchNumber: 'FB-1' });

      await service.update('b1', { actualGasQty: 1190 } as any, COMPANY_ID);

      expect(tx.fillingBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { actualGasQty: 1190, gasVariance: 10 },
      });
    });

    it('reports a negative variance when actual consumption is below expected', async () => {
      (service.findOne as jest.Mock).mockResolvedValue({ id: 'b1', expectedGasQty: 1180, status: 'PENDING', tankId: 'tank1', cylinderTypeId: 'ct1', numberOfCylinders: 100, batchNumber: 'FB-1' });

      await service.update('b1', { actualGasQty: 1170 } as any, COMPANY_ID);

      expect(tx.fillingBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { actualGasQty: 1170, gasVariance: -10 },
      });
    });

    it('throws NotFoundException for a missing batch', async () => {
      (service.findOne as jest.Mock).mockRejectedValue(new NotFoundException());
      await expect(service.update('missing', { actualGasQty: 100 } as any, COMPANY_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update — completing a batch moves real stock', () => {
    const pendingBatch = { id: 'b1', expectedGasQty: 500, actualGasQty: 0, status: 'PENDING', tankId: 'tank1', cylinderTypeId: 'ct1', numberOfCylinders: 100, batchNumber: 'FB-1' };

    it('decrements tank gas and moves cylinders EMPTY -> FILLED on completion', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(pendingBatch);

      await service.update('b1', { actualGasQty: 500, status: 'COMPLETED' } as any, COMPANY_ID);

      expect(tx.storageTank.update).toHaveBeenCalledWith({ where: { id: 'tank1' }, data: { currentQuantity: 500 } }); // 1000 - 500
      expect(tx.cylinderInventory.update).toHaveBeenCalledWith({
        where: { cylinderTypeId_status: { cylinderTypeId: 'ct1', status: 'EMPTY' } },
        data: { quantity: { decrement: 100 } },
      });
      expect(tx.cylinderInventory.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { cylinderTypeId_status: { cylinderTypeId: 'ct1', status: 'FILLED' } },
      }));
    });

    it('rejects completion if the tank does not have enough gas', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(pendingBatch);
      tx.storageTank.findUnique.mockResolvedValue({ id: 'tank1', tankName: 'Tank 1', currentQuantity: 100, capacity: 5000, gasProductId: 'gp1' });

      await expect(service.update('b1', { actualGasQty: 500, status: 'COMPLETED' } as any, COMPANY_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects completion if there are not enough empty cylinders', async () => {
      (service.findOne as jest.Mock).mockResolvedValue(pendingBatch);
      tx.cylinderInventory.findUnique.mockResolvedValue({ quantity: 5 });

      await expect(service.update('b1', { actualGasQty: 500, status: 'COMPLETED' } as any, COMPANY_ID)).rejects.toThrow(BadRequestException);
    });

    it('does not re-apply the stock movement on a second, unrelated edit of an already-completed batch', async () => {
      (service.findOne as jest.Mock).mockResolvedValue({ ...pendingBatch, status: 'COMPLETED', actualGasQty: 500 });

      await service.update('b1', { notes: 'just a note' } as any, COMPANY_ID);

      expect(tx.storageTank.update).not.toHaveBeenCalled();
      expect(tx.cylinderInventory.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('blocks deleting a completed batch', async () => {
      (service.findOne as jest.Mock).mockResolvedValue({ id: 'b1', status: 'COMPLETED', batchNumber: 'FB-1' });
      await expect(service.remove('b1', COMPANY_ID)).rejects.toThrow(BadRequestException);
    });
  });
});
