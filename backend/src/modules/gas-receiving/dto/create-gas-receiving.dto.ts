import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateGasReceivingDto {
  @IsString() @IsNotEmpty() receivingNumber: string;
  @IsString() @IsNotEmpty() purchaseId: string;
  @IsString() @IsNotEmpty() supplierId: string;
  @IsDateString() receivingDate: string;
  @IsNumber() expectedQuantity: number;
  @IsNumber() receivedQuantity: number;
  @IsString() @IsOptional() unit?: string;
  @IsString() @IsNotEmpty() tankId: string;
  @IsString() @IsOptional() receivedById?: string;
  @IsString() @IsOptional() notes?: string;
}
