import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SaleReturnItemDto {
  @IsString() @IsNotEmpty() saleItemId: string;
  @IsInt() @Min(1) quantity: number;
}

export class CreateSaleReturnDto {
  @IsString() @IsNotEmpty() returnNumber: string;
  @IsString() @IsNotEmpty() saleId: string;
  @IsDateString() returnDate: string;
  @IsString() @IsOptional() reason?: string;
  @IsString() @IsOptional() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleReturnItemDto)
  items: SaleReturnItemDto[];
}
