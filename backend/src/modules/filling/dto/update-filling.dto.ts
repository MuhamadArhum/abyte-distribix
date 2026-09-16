import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateFillingDto {
  @IsNumber() @IsOptional() @Min(0) actualGasQty?: number;
  @IsString() @IsOptional() status?: string;
  @IsString() @IsOptional() notes?: string;
}
