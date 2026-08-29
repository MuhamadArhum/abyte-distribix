import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get() findAll() { return this.salesService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.salesService.findOne(id); }
  @Post() create(@Body() dto: CreateSaleDto) { return this.salesService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateSaleDto) { return this.salesService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.salesService.remove(id); }
}
