import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateSaleDto {
  @IsNumber() @IsOptional() paidAmount?: number;
  @IsString() @IsOptional() paymentMethod?: string;
  @IsString() @IsOptional() paymentStatus?: string;
  @IsString() @IsOptional() notes?: string;
}
