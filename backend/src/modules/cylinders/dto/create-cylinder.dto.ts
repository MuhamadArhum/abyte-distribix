import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateCylinderTypeDto {
  @IsString() @IsNotEmpty() cylinderSize: string;
  @IsNumber() gasCapacity: number;
  @IsNumber() emptyWeight: number;
  @IsNumber() @IsOptional() depositAmount?: number;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() sellingPrices?: string;
}
