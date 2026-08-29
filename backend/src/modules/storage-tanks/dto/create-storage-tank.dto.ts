import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateStorageTankDto {
  @IsString() @IsNotEmpty() tankNumber: string;
  @IsString() @IsNotEmpty() tankName: string;
  @IsString() @IsNotEmpty() gasProductId: string;
  @IsNumber() capacity: number;
  @IsNumber() @IsOptional() currentQuantity?: number;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() status?: string;
}
