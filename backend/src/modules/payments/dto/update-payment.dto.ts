import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdatePaymentDto {
  @IsNumber() @IsOptional() amount?: number;
  @IsString() @IsOptional() notes?: string;
}
