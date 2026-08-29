import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class CreateSupplierDto {
  @IsString() @IsNotEmpty() supplierCode: string;
  @IsString() @IsNotEmpty() supplierName: string;
  @IsString() @IsOptional() contactPerson?: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() taxNtn?: string;
  @IsNumber() @IsOptional() openingBalance?: number;
  @IsNumber() @IsOptional() paymentTerms?: number;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
}
