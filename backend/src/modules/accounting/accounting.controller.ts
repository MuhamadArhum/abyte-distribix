import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('cash-book') getCashBook(@Query('startDate') s?: string, @Query('endDate') e?: string) { return this.accountingService.getCashBook(s, e); }
  @Get('bank-book') getBankBook(@Query('startDate') s?: string, @Query('endDate') e?: string) { return this.accountingService.getBankBook(s, e); }
  @Get('profit-loss') getProfitLoss(@Query('startDate') s?: string, @Query('endDate') e?: string) { return this.accountingService.getProfitLoss(s, e); }
}
