import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
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
  @Get('customer') findAllCustomer() { return this.paymentsService.findAllCustomerPayments(); }
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES')
  @Get('customer/:id') findOneCustomer(@Param('id') id: string) { return this.paymentsService.findOneCustomerPayment(id); }
  @Roles('ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES')
  @Post('customer') createCustomer(@Body() dto: CreateCustomerPaymentDto) { return this.paymentsService.createCustomerPayment(dto); }

  // Supplier payments: Accountant/Manager/Admin only
  @Get('supplier') findAllSupplier() { return this.paymentsService.findAllSupplierPayments(); }
  @Get('supplier/:id') findOneSupplier(@Param('id') id: string) { return this.paymentsService.findOneSupplierPayment(id); }
  @Post('supplier') createSupplier(@Body() dto: CreateSupplierPaymentDto) { return this.paymentsService.createSupplierPayment(dto); }
}
