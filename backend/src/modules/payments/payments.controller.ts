import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCustomerPaymentDto, CreateSupplierPaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'ACCOUNTANT')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Customer payments: Sales User is also permitted per SRS (records customer payments)
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES')
  @Get('customer')
  findAllCustomer(
    @Query('search') search?: string,
    @Query('method') method?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.paymentsService.findAllCustomerPayments(req.user?.companyId, {
      search, method, from, to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES')
  @Get('customer/summary') getCustomerSummary(@Request() req: any) { return this.paymentsService.getCustomerPaymentsSummary(req.user?.companyId); }
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES')
  @Get('customer/:id') findOneCustomer(@Param('id') id: string, @Request() req: any) { return this.paymentsService.findOneCustomerPayment(id, req.user?.companyId); }
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES')
  @Post('customer') createCustomer(@Body() dto: CreateCustomerPaymentDto, @Request() req: any) { return this.paymentsService.createCustomerPayment(dto, req.user?.companyId, req.user?.userId); }
  @Delete('customer/:id') removeCustomer(@Param('id') id: string, @Request() req: any) { return this.paymentsService.removeCustomerPayment(id, req.user?.companyId, req.user?.userId); }

  // Supplier payments: Accountant/Manager/Admin only
  @Get('supplier')
  findAllSupplier(
    @Query('search') search?: string,
    @Query('method') method?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.paymentsService.findAllSupplierPayments(req.user?.companyId, {
      search, method, from, to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
  @Get('supplier/summary') getSupplierSummary(@Request() req: any) { return this.paymentsService.getSupplierPaymentsSummary(req.user?.companyId); }
  @Get('supplier/:id') findOneSupplier(@Param('id') id: string, @Request() req: any) { return this.paymentsService.findOneSupplierPayment(id, req.user?.companyId); }
  @Post('supplier') createSupplier(@Body() dto: CreateSupplierPaymentDto, @Request() req: any) { return this.paymentsService.createSupplierPayment(dto, req.user?.companyId, req.user?.userId); }
  @Delete('supplier/:id') removeSupplier(@Param('id') id: string, @Request() req: any) { return this.paymentsService.removeSupplierPayment(id, req.user?.companyId, req.user?.userId); }
}
