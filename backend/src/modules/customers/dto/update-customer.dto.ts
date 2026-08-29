import { IsString, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class UpdateCustomerDto {
  @IsString() @IsOptional() businessName?: string;
  @IsString() @IsOptional() contactPerson?: string;
  @IsString() @IsOptional() phone?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() customerType?: string;
  @IsNumber() @IsOptional() creditLimit?: number;
  @IsNumber() @IsOptional() paymentTerms?: number;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
}
