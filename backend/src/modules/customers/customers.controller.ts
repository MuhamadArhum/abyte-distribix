import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('customerType') customerType?: string,
    @Query('status') status?: string,
    @Query('balance') balance?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.customersService.findAll(req.user?.companyId, {
      search, customerType, status, balance,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
  @Get('summary') getSummary(@Request() req: any) { return this.customersService.getSummary(req.user?.companyId); }
  @Get(':id/ledger') getLedger(@Param('id') id: string, @Request() req: any) { return this.customersService.getLedger(id, req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.customersService.findOne(id, req.user?.companyId); }
  @Post() create(@Body() dto: CreateCustomerDto, @Request() req: any) { return this.customersService.create(dto, req.user?.companyId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @Request() req: any) { return this.customersService.update(id, dto, req.user?.companyId); }
  @Roles('ADMIN', 'MANAGER')
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.customersService.remove(id, req.user?.companyId); }
}
