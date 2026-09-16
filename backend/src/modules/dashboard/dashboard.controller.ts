import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Request() req?: any,
  ) {
    return this.dashboardService.getStats(req.user?.companyId, range, from, to);
  }

  @Get('sales-chart')
  getSalesChart(@Request() req: any) { return this.dashboardService.getSalesChart(req.user?.companyId); }

  @Get('recent-sales')
  getRecentSales(@Request() req: any) { return this.dashboardService.getRecentSales(req.user?.companyId); }

  @Get('pending-purchases')
  getPendingPurchases(@Request() req: any) { return this.dashboardService.getPendingPurchases(req.user?.companyId); }

  @Get('top-debtors')
  getTopDebtors(@Request() req: any) { return this.dashboardService.getTopDebtors(req.user?.companyId); }
}
