import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'SALES')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.salesService.findAll(req.user?.companyId, {
      search, status, method, from, to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
  @Get('summary') getSummary(@Request() req: any) { return this.salesService.getSummary(req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.salesService.findOne(id, req.user?.companyId); }
  @Post() create(@Body() dto: CreateSaleDto, @Request() req: any) { return this.salesService.create(dto, req.user?.companyId, req.user?.userId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateSaleDto, @Request() req: any) { return this.salesService.update(id, dto, req.user?.companyId); }
  @Roles('ADMIN', 'MANAGER')
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.salesService.remove(id, req.user?.companyId, req.user?.userId); }
}
