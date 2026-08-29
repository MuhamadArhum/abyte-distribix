import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateStorageTankDto {
  @IsString() @IsOptional() tankName?: string;
  @IsNumber() @IsOptional() capacity?: number;
  @IsNumber() @IsOptional() currentQuantity?: number;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() status?: string;
}
