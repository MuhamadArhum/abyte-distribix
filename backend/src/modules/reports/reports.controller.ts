import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales') getSales(@Query('startDate') s?: string, @Query('endDate') e?: string) { return this.reportsService.getSalesReport(s, e); }
  @Get('purchases') getPurchases(@Query('startDate') s?: string, @Query('endDate') e?: string) { return this.reportsService.getPurchaseReport(s, e); }
  @Get('receivables') getReceivables() { return this.reportsService.getCustomerReceivables(); }
  @Get('payables') getPayables() { return this.reportsService.getSupplierPayables(); }
  @Get('inventory') getInventory() { return this.reportsService.getInventoryReport(); }
  @Get('profit-loss') getProfitLoss(@Query('startDate') s?: string, @Query('endDate') e?: string) { return this.reportsService.getProfitLossReport(s, e); }
  @Get('cylinder-movement') getCylinderMovement(@Query('startDate') s?: string, @Query('endDate') e?: string) { return this.reportsService.getCylinderMovementReport(s, e); }
  @Get('sales-by-user') getSalesByUser(@Query('startDate') s?: string, @Query('endDate') e?: string) { return this.reportsService.getSalesByUserReport(s, e); }
  @Get('sales-returns') getSalesReturns(@Query('startDate') s?: string, @Query('endDate') e?: string) { return this.reportsService.getSalesReturnsReport(s, e); }
}
