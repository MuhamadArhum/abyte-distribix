import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales') getSales(@Query('startDate') s?: string, @Query('endDate') e?: string, @Request() req?: any) { return this.reportsService.getSalesReport(req.user?.companyId, s, e); }
  @Get('purchases') getPurchases(@Query('startDate') s?: string, @Query('endDate') e?: string, @Request() req?: any) { return this.reportsService.getPurchaseReport(req.user?.companyId, s, e); }
  @Get('receivables') getReceivables(@Request() req: any) { return this.reportsService.getCustomerReceivables(req.user?.companyId); }
  @Get('payables') getPayables(@Request() req: any) { return this.reportsService.getSupplierPayables(req.user?.companyId); }
  @Get('inventory') getInventory(@Request() req: any) { return this.reportsService.getInventoryReport(req.user?.companyId); }
  @Get('profit-loss') getProfitLoss(@Query('startDate') s?: string, @Query('endDate') e?: string, @Request() req?: any) { return this.reportsService.getProfitLossReport(req.user?.companyId, s, e); }
  @Get('cylinder-movement') getCylinderMovement(@Query('startDate') s?: string, @Query('endDate') e?: string, @Request() req?: any) { return this.reportsService.getCylinderMovementReport(req.user?.companyId, s, e); }
  @Get('sales-by-user') getSalesByUser(@Query('startDate') s?: string, @Query('endDate') e?: string, @Request() req?: any) { return this.reportsService.getSalesByUserReport(req.user?.companyId, s, e); }
  @Get('sales-returns') getSalesReturns(@Query('startDate') s?: string, @Query('endDate') e?: string, @Request() req?: any) { return this.reportsService.getSalesReturnsReport(req.user?.companyId, s, e); }
}
