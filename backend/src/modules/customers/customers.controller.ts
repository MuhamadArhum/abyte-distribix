import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get() findAll() { return this.customersService.findAll(); }
  @Get(':id/ledger') getLedger(@Param('id') id: string) { return this.customersService.getLedger(id); }
  @Get(':id') findOne(@Param('id') id: string) { return this.customersService.findOne(id); }
  @Post() create(@Body() dto: CreateCustomerDto) { return this.customersService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.customersService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.customersService.remove(id); }
}
