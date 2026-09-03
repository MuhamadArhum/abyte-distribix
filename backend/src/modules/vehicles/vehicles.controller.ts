import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get() findAll() { return this.vehiclesService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.vehiclesService.findOne(id); }
  @Post() create(@Body() dto: any) { return this.vehiclesService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.vehiclesService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.vehiclesService.remove(id); }
}
