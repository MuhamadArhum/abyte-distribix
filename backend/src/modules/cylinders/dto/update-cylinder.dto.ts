import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateCylinderTypeDto {
  @IsString() @IsOptional() cylinderSize?: string;
  @IsNumber() @IsOptional() gasCapacity?: number;
  @IsNumber() @IsOptional() emptyWeight?: number;
  @IsNumber() @IsOptional() depositAmount?: number;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() sellingPrices?: string;
}
