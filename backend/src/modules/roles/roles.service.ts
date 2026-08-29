import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAll() { return this.prisma.role.findMany(); }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  create(data: { name: string; description?: string; permissions?: string }) {
    return this.prisma.role.create({ data: { name: data.name, description: data.description, permissions: data.permissions || '[]' } });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.role.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.role.delete({ where: { id } });
  }
}
