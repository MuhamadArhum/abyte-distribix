import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateGasProductDto {
  @IsString() @IsOptional() productName?: string;
  @IsString() @IsOptional() gasType?: string;
  @IsString() @IsOptional() unit?: string;
  @IsNumber() @IsOptional() defaultPurchaseRate?: number;
  @IsNumber() @IsOptional() defaultSellingRate?: number;
  @IsNumber() @IsOptional() minStockLevel?: number;
  @IsString() @IsOptional() status?: string;
}
