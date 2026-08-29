import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateCustomerPaymentDto {
  @IsString() @IsNotEmpty() paymentNumber: string;
  @IsString() @IsNotEmpty() customerId: string;
  @IsString() @IsOptional() saleId?: string;
  @IsDateString() paymentDate: string;
  @IsNumber() amount: number;
  @IsString() @IsOptional() paymentMethod?: string;
  @IsString() @IsOptional() reference?: string;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() createdById?: string;
}

export class CreateSupplierPaymentDto {
  @IsString() @IsNotEmpty() paymentNumber: string;
  @IsString() @IsNotEmpty() supplierId: string;
  @IsString() @IsOptional() purchaseId?: string;
  @IsDateString() paymentDate: string;
  @IsNumber() amount: number;
  @IsString() @IsOptional() paymentMethod?: string;
  @IsString() @IsOptional() reference?: string;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() createdById?: string;
}
