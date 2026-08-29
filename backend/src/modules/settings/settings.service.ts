import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  findAll() { return this.prisma.setting.findMany({ orderBy: { key: 'asc' } }); }

  async findByKey(key: string) { return this.prisma.setting.findUnique({ where: { key } }); }

  async upsert(key: string, value: string, description?: string) {
    return this.prisma.setting.upsert({
      where: { key },
      create: { key, value, description },
      update: { value },
    });
  }

  async remove(id: string) { return this.prisma.setting.delete({ where: { id } }); }

  async bulkUpsert(settings: { key: string; value: string; description?: string }[]) {
    return Promise.all(settings.map((s) => this.upsert(s.key, s.value, s.description)));
  }
}
