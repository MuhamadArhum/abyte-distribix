import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get() findAll() { return this.deliveriesService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.deliveriesService.findOne(id); }
  @Post() create(@Body() dto: any) { return this.deliveriesService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.deliveriesService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.deliveriesService.remove(id); }
}
