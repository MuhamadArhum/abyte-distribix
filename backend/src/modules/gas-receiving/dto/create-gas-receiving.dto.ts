import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateGasReceivingDto {
  @IsString() @IsNotEmpty() receivingNumber: string;
  @IsString() @IsNotEmpty() purchaseId: string;
  @IsString() @IsNotEmpty() supplierId: string;
  @IsDateString() receivingDate: string;
  @IsNumber() @Min(0.01) expectedQuantity: number;
  @IsNumber() @Min(0.01) receivedQuantity: number;
  @IsString() @IsOptional() unit?: string;
  @IsString() @IsNotEmpty() tankId: string;
  @IsString() @IsOptional() receivedById?: string;
  @IsString() @IsOptional() notes?: string;
}
