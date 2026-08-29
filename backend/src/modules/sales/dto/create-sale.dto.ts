import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @IsString() @IsNotEmpty() cylinderTypeId: string;
  @IsNumber() quantity: number;
  @IsNumber() unitPrice: number;
  @IsNumber() @IsOptional() discount?: number;
}

export class CreateSaleDto {
  @IsString() @IsNotEmpty() invoiceNumber: string;
  @IsString() @IsNotEmpty() customerId: string;
  @IsDateString() saleDate: string;
  @IsNumber() @IsOptional() discount?: number;
  @IsNumber() @IsOptional() paidAmount?: number;
  @IsString() @IsOptional() paymentMethod?: string;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() createdById?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}
