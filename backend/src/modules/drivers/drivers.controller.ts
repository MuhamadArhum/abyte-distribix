import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get() findAll() { return this.driversService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.driversService.findOne(id); }
  @Post() create(@Body() dto: any) { return this.driversService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.driversService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.driversService.remove(id); }
}
