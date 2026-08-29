import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get() findAll() { return this.suppliersService.findAll(); }
  @Get(':id/ledger') getLedger(@Param('id') id: string) { return this.suppliersService.getLedger(id); }
  @Get(':id') findOne(@Param('id') id: string) { return this.suppliersService.findOne(id); }
  @Post() create(@Body() dto: CreateSupplierDto) { return this.suppliersService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) { return this.suppliersService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.suppliersService.remove(id); }
}
