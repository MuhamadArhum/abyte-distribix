import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('cash-book')
  getCashBook(
    @Query('startDate') s?: string,
    @Query('endDate') e?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.accountingService.getCashBook(req.user?.companyId, s, e, page !== undefined ? Number(page) : undefined, limit !== undefined ? Number(limit) : undefined);
  }
  @Get('bank-book')
  getBankBook(
    @Query('startDate') s?: string,
    @Query('endDate') e?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.accountingService.getBankBook(req.user?.companyId, s, e, page !== undefined ? Number(page) : undefined, limit !== undefined ? Number(limit) : undefined);
  }
  @Get('profit-loss') getProfitLoss(@Query('startDate') s?: string, @Query('endDate') e?: string, @Request() req?: any) { return this.accountingService.getProfitLoss(req.user?.companyId, s, e); }
}
