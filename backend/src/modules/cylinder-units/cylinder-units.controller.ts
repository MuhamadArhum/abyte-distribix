import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { CylinderUnitsService } from './cylinder-units.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
@Controller('cylinder-units')
export class CylinderUnitsController {
  constructor(private readonly service: CylinderUnitsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('cylinderTypeId') cylinderTypeId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.service.findAll(req.user?.companyId, status, cylinderTypeId, search, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50);
  }

  @Get('summary') getSummary(@Request() req: any) { return this.service.getSummary(req.user?.companyId); }

  @Get('by-serial/:serialNumber')
  findBySerial(@Param('serialNumber') serialNumber: string, @Request() req: any) {
    return this.service.findBySerial(serialNumber, req.user?.companyId);
  }

  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.service.findOne(id, req.user?.companyId); }
  @Post() create(@Body() dto: any, @Request() req: any) { return this.service.create(dto, req.user?.companyId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any, @Request() req: any) { return this.service.update(id, dto, req.user?.companyId); }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.service.remove(id, req.user?.companyId); }
}
