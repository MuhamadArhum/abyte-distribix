import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber, IsEnum } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @IsNotEmpty() customerCode: string;
  @IsString() @IsNotEmpty() businessName: string;
  @IsString() @IsOptional() contactPerson?: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() customerType?: string;
  @IsNumber() @IsOptional() creditLimit?: number;
  @IsNumber() @IsOptional() openingBalance?: number;
  @IsNumber() @IsOptional() paymentTerms?: number;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
}
