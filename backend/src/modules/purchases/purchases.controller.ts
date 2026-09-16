import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.purchasesService.findAll(req.user?.companyId, {
      search, status, supplierId, from, to,
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }
  @Get('summary') getSummary(@Request() req: any) { return this.purchasesService.getSummary(req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.purchasesService.findOne(id, req.user?.companyId); }
  @Post() create(@Body() dto: CreatePurchaseDto, @Request() req: any) { return this.purchasesService.create(dto, req.user?.companyId, req.user?.userId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePurchaseDto, @Request() req: any) { return this.purchasesService.update(id, dto, req.user?.companyId); }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.purchasesService.remove(id, req.user?.companyId, req.user?.userId); }
}
