import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateGasReceivingDto {
  @IsNumber() @IsOptional() receivedQuantity?: number;
  @IsString() @IsOptional() notes?: string;
}
