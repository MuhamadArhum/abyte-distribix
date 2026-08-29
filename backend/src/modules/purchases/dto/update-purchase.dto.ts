import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdatePurchaseDto {
  @IsNumber() @IsOptional() paidAmount?: number;
  @IsString() @IsOptional() paymentStatus?: string;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
}
