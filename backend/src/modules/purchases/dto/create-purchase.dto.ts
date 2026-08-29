import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreatePurchaseDto {
  @IsString() @IsNotEmpty() purchaseNumber: string;
  @IsString() @IsNotEmpty() supplierId: string;
  @IsString() @IsNotEmpty() gasProductId: string;
  @IsDateString() purchaseDate: string;
  @IsNumber() quantity: number;
  @IsString() @IsOptional() unit?: string;
  @IsNumber() purchaseRate: number;
  @IsNumber() @IsOptional() transportation?: number;
  @IsNumber() @IsOptional() otherCharges?: number;
  @IsNumber() @IsOptional() discount?: number;
  @IsString() @IsOptional() supplierInvoiceNumber?: string;
  @IsString() @IsOptional() notes?: string;
}
