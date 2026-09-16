import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  findAll(companyId: string) { return this.prisma.setting.findMany({ where: { companyId }, orderBy: { key: 'asc' } }); }

  async findByKey(key: string, companyId: string) { return this.prisma.setting.findFirst({ where: { key, companyId } }); }

  async upsert(key: string, value: string, companyId: string, description?: string) {
    return this.prisma.setting.upsert({
      where: { companyId_key: { companyId, key } },
      create: { key, value, description, companyId },
      update: { value },
    });
  }

  async remove(id: string, companyId: string) {
    const existing = await this.prisma.setting.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException(`Setting ${id} not found`);
    return this.prisma.setting.delete({ where: { id } });
  }

  async bulkUpsert(settings: { key: string; value: string; description?: string }[], companyId: string) {
    return Promise.all(settings.map((s) => this.upsert(s.key, s.value, companyId, s.description)));
  }
}
