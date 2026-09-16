import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CylinderUnitsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, status?: string, cylinderTypeId?: string, search?: string, page = 1, limit = 50) {
    const where: any = { companyId };
    if (status) where.status = status;
    if (cylinderTypeId) where.cylinderTypeId = cylinderTypeId;
    if (search) where.serialNumber = { contains: search };

    const take = Math.min(Math.max(limit, 1), 200);
    const currentPage = Math.max(page, 1);

    const [data, total] = await Promise.all([
      this.prisma.cylinderUnit.findMany({
        where,
        include: { cylinderType: true, customer: true },
        orderBy: { serialNumber: 'asc' },
        skip: (currentPage - 1) * take,
        take,
      }),
      this.prisma.cylinderUnit.count({ where }),
    ]);

    return { data, total, page: currentPage, limit: take, totalPages: Math.ceil(total / take) };
  }

  async getSummary(companyId: string) {
    const [total, byStatus] = await Promise.all([
      this.prisma.cylinderUnit.count({ where: { companyId } }),
      this.prisma.cylinderUnit.groupBy({ by: ['status'], where: { companyId }, _count: true }),
    ]);
    const counts: Record<string, number> = {};
    for (const row of byStatus) counts[row.status] = row._count;
    return { total, byStatus: counts };
  }

  async findOne(id: string, companyId: string) {
    const unit = await this.prisma.cylinderUnit.findFirst({
      where: { id, companyId },
      include: { cylinderType: true, customer: true },
    });
    if (!unit) throw new NotFoundException('Cylinder unit not found');
    return unit;
  }

  async findBySerial(serialNumber: string, companyId: string) {
    const unit = await this.prisma.cylinderUnit.findFirst({
      where: { serialNumber, companyId },
      include: { cylinderType: true, customer: true },
    });
    if (!unit) throw new NotFoundException('Cylinder unit not found');
    return unit;
  }

  async create(dto: any, companyId: string) {
    const { purchaseDate, ...rest } = dto;
    const qrCode = `CYL-${dto.serialNumber}-${Date.now()}`;
    return this.prisma.cylinderUnit.create({
      data: { ...rest, companyId, qrCode, purchaseDate: purchaseDate ? new Date(purchaseDate) : null },
      include: { cylinderType: true, customer: true },
    });
  }

  async update(id: string, dto: any, companyId: string) {
    const existing = await this.findOne(id, companyId);
    const { purchaseDate, ...rest } = dto;
    const data: any = { ...rest };
    if (purchaseDate) data.purchaseDate = new Date(purchaseDate);

    // A cylinder already recorded WITH_CUSTOMER cannot be silently
    // reassigned to a different customer — it must first come back
    // (status EMPTY/FILLED/DAMAGED/MAINTENANCE/LOST) so there's always an
    // explicit "returned" step before a new assignment.
    const newStatus = data.status ?? existing.status;
    const newCustomerId = 'customerId' in data ? data.customerId : existing.customerId;
    if (newStatus === 'WITH_CUSTOMER' && newCustomerId) {
      const isSameHolder = existing.status === 'WITH_CUSTOMER' && existing.customerId === newCustomerId;
      const isCurrentlyAvailable = existing.status === 'FILLED' || existing.status === 'EMPTY';
      if (!isSameHolder && !isCurrentlyAvailable) {
        throw new BadRequestException(
          `Cannot assign cylinder ${existing.serialNumber} to this customer — it is currently recorded as ${existing.status}${existing.customerId ? ' with a different customer' : ''}. Mark it EMPTY/FILLED (returned) first.`,
        );
      }
    }

    return this.prisma.cylinderUnit.update({
      where: { id },
      data,
      include: { cylinderType: true, customer: true },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.cylinderUnit.delete({ where: { id } });
  }
}
