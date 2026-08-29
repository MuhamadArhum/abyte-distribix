import { IsString, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class UpdateSupplierDto {
  @IsString() @IsOptional() supplierName?: string;
  @IsString() @IsOptional() contactPerson?: string;
  @IsString() @IsOptional() phone?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() taxNtn?: string;
  @IsNumber() @IsOptional() paymentTerms?: number;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
}
