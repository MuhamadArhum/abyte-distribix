import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats() { return this.dashboardService.getStats(); }

  @Get('sales-chart')
  getSalesChart() { return this.dashboardService.getSalesChart(); }

  @Get('recent-sales')
  getRecentSales() { return this.dashboardService.getRecentSales(); }

  @Get('pending-purchases')
  getPendingPurchases() { return this.dashboardService.getPendingPurchases(); }

  @Get('top-debtors')
  getTopDebtors() { return this.dashboardService.getTopDebtors(); }
}
