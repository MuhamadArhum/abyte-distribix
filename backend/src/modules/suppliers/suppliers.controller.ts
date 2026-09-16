import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('balance') balance?: string,
    @Query('paymentTerms') paymentTerms?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.suppliersService.findAll(req.user?.companyId, {
      search, status, balance, paymentTerms,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
  @Get('summary') getSummary(@Request() req: any) { return this.suppliersService.getSummary(req.user?.companyId); }
  @Get(':id/ledger') getLedger(@Param('id') id: string, @Request() req: any) { return this.suppliersService.getLedger(id, req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.suppliersService.findOne(id, req.user?.companyId); }
  @Post() create(@Body() dto: CreateSupplierDto, @Request() req: any) { return this.suppliersService.create(dto, req.user?.companyId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @Request() req: any) { return this.suppliersService.update(id, dto, req.user?.companyId); }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.suppliersService.remove(id, req.user?.companyId); }
}
