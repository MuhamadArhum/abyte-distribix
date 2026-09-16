import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { StorageTanksService } from './storage-tanks.service';
import { CreateStorageTankDto } from './dto/create-storage-tank.dto';
import { UpdateStorageTankDto } from './dto/update-storage-tank.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
@Controller('storage-tanks')
export class StorageTanksController {
  constructor(private readonly storageTanksService: StorageTanksService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.storageTanksService.findAll(req.user?.companyId, {
      search, status,
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }
  @Get('summary') getSummary(@Request() req: any) { return this.storageTanksService.getSummary(req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.storageTanksService.findOne(id, req.user?.companyId); }
  @Post() create(@Body() dto: CreateStorageTankDto, @Request() req: any) { return this.storageTanksService.create(dto, req.user?.companyId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateStorageTankDto, @Request() req: any) { return this.storageTanksService.update(id, dto, req.user?.companyId); }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.storageTanksService.remove(id, req.user?.companyId); }
}
