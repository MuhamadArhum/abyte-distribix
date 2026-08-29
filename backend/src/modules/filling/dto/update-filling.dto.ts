import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateFillingDto {
  @IsNumber() @IsOptional() actualGasQty?: number;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
}
