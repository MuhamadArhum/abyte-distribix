import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get() findAll() { return this.purchasesService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.purchasesService.findOne(id); }
  @Post() create(@Body() dto: CreatePurchaseDto) { return this.purchasesService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) { return this.purchasesService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.purchasesService.remove(id); }
}
