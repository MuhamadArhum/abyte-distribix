import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('gas-stock')
  getGasStock(@Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string, @Request() req?: any) {
    return this.inventoryService.getGasStock(req.user?.companyId, search, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }
  @Get('cylinder-stock')
  getCylinderStock(@Query('search') search?: string, @Query('page') page?: string, @Query('limit') limit?: string, @Request() req?: any) {
    return this.inventoryService.getCylinderStock(req.user?.companyId, search, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }
  @Get('transactions') getTransactions(@Query('tankId') tankId?: string, @Request() req?: any) { return this.inventoryService.getTransactions(req.user?.companyId, tankId); }
  @Post('adjustment') createAdjustment(@Body() body: CreateAdjustmentDto, @Request() req: any) {
    return this.inventoryService.createAdjustment({ ...body, createdById: req.user?.userId }, req.user?.companyId);
  }
}
