import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { CylinderUnitsService } from './cylinder-units.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cylinder-units')
export class CylinderUnitsController {
  constructor(private readonly service: CylinderUnitsService) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('cylinderTypeId') cylinderTypeId?: string) {
    return this.service.findAll(status, cylinderTypeId);
  }

  @Get('by-serial/:serialNumber')
  findBySerial(@Param('serialNumber') serialNumber: string) {
    return this.service.findBySerial(serialNumber);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
