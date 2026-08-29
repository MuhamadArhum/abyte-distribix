import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { GasProductsService } from './gas-products.service';
import { CreateGasProductDto } from './dto/create-gas-product.dto';
import { UpdateGasProductDto } from './dto/update-gas-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('gas-products')
export class GasProductsController {
  constructor(private readonly gasProductsService: GasProductsService) {}

  @Get() findAll() { return this.gasProductsService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.gasProductsService.findOne(id); }
  @Post() create(@Body() dto: CreateGasProductDto) { return this.gasProductsService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateGasProductDto) { return this.gasProductsService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.gasProductsService.remove(id); }
}
