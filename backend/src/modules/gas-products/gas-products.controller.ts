import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { GasProductsService } from './gas-products.service';
import { CreateGasProductDto } from './dto/create-gas-product.dto';
import { UpdateGasProductDto } from './dto/update-gas-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
@Controller('gas-products')
export class GasProductsController {
  constructor(private readonly gasProductsService: GasProductsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('gasType') gasType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.gasProductsService.findAll(req.user?.companyId, {
      search, gasType, status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
  @Get('summary') getSummary(@Request() req: any) { return this.gasProductsService.getSummary(req.user?.companyId); }
  @Get('low-stock') getLowStock(@Request() req: any) { return this.gasProductsService.getLowStock(req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.gasProductsService.findOne(id, req.user?.companyId); }
  @Post() create(@Body() dto: CreateGasProductDto, @Request() req: any) { return this.gasProductsService.create(dto, req.user?.companyId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateGasProductDto, @Request() req: any) { return this.gasProductsService.update(id, dto, req.user?.companyId); }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.gasProductsService.remove(id, req.user?.companyId); }
}
