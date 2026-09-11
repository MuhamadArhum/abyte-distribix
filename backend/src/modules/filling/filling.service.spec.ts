import { NotFoundException } from '@nestjs/common';
import { FillingService } from './filling.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FillingService', () => {
  let service: FillingService;
  let prisma: {
    fillingBatch: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      fillingBatch: { findUnique: jest.fn(), update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)) },
    };
    service = new FillingService(prisma as unknown as PrismaService);
  });

  describe('update', () => {
    it('computes gas variance as actual minus expected (SRS Section 17)', async () => {
      prisma.fillingBatch.findUnique.mockResolvedValue({ id: 'b1', expectedGasQty: 1180 });

      await service.update('b1', { actualGasQty: 1190 } as any);

      expect(prisma.fillingBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { actualGasQty: 1190, gasVariance: 10 },
      });
    });

    it('reports a negative variance when actual consumption is below expected', async () => {
      prisma.fillingBatch.findUnique.mockResolvedValue({ id: 'b1', expectedGasQty: 1180 });

      await service.update('b1', { actualGasQty: 1170 } as any);

      expect(prisma.fillingBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { actualGasQty: 1170, gasVariance: -10 },
      });
    });

    it('throws NotFoundException for a missing batch', async () => {
      prisma.fillingBatch.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { actualGasQty: 100 } as any)).rejects.toThrow(NotFoundException);
    });
  });
});
