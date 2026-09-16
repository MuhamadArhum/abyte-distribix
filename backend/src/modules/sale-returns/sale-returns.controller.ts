import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SaleReturnsService } from './sale-returns.service';
import { CreateSaleReturnDto } from './dto/create-sale-return.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'SALES')
@Controller('sale-returns')
export class SaleReturnsController {
  constructor(private readonly saleReturnsService: SaleReturnsService) {}

  @Get() findAll(@Request() req: any) { return this.saleReturnsService.findAll(req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.saleReturnsService.findOne(id, req.user?.companyId); }
  @Post() create(@Body() dto: CreateSaleReturnDto, @Request() req: any) { return this.saleReturnsService.create(dto, req.user?.companyId); }
}
