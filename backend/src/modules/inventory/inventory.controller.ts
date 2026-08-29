import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('gas-stock') getGasStock() { return this.inventoryService.getGasStock(); }
  @Get('cylinder-stock') getCylinderStock() { return this.inventoryService.getCylinderStock(); }
  @Get('transactions') getTransactions(@Query('tankId') tankId?: string) { return this.inventoryService.getTransactions(tankId); }
  @Post('adjustment') createAdjustment(@Body() body: any) { return this.inventoryService.createAdjustment(body); }
}
