import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateGasProductDto {
  @IsString() @IsNotEmpty() productCode: string;
  @IsString() @IsNotEmpty() productName: string;
  @IsString() @IsNotEmpty() gasType: string;
  @IsString() @IsOptional() unit?: string;
  @IsNumber() @IsOptional() defaultPurchaseRate?: number;
  @IsNumber() @IsOptional() defaultSellingRate?: number;
  @IsNumber() @IsOptional() minStockLevel?: number;
  @IsString() @IsOptional() status?: string;
}
