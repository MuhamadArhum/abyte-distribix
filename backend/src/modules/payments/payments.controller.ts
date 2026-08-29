import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateCustomerPaymentDto, CreateSupplierPaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('customer') findAllCustomer() { return this.paymentsService.findAllCustomerPayments(); }
  @Get('customer/:id') findOneCustomer(@Param('id') id: string) { return this.paymentsService.findOneCustomerPayment(id); }
  @Post('customer') createCustomer(@Body() dto: CreateCustomerPaymentDto) { return this.paymentsService.createCustomerPayment(dto); }

  @Get('supplier') findAllSupplier() { return this.paymentsService.findAllSupplierPayments(); }
  @Get('supplier/:id') findOneSupplier(@Param('id') id: string) { return this.paymentsService.findOneSupplierPayment(id); }
  @Post('supplier') createSupplier(@Body() dto: CreateSupplierPaymentDto) { return this.paymentsService.createSupplierPayment(dto); }
}
