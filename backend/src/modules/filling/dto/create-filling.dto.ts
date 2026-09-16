import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class CreateFillingDto {
  @IsString() @IsNotEmpty() batchNumber: string;
  @IsDateString() fillingDate: string;
  @IsString() @IsNotEmpty() tankId: string;
  @IsString() @IsNotEmpty() cylinderTypeId: string;
  @IsNumber() @Min(1) numberOfCylinders: number;
  @IsNumber() @Min(0.01) expectedGasQty: number;
  @IsString() @IsOptional() operatorId?: string;
  @IsString() @IsOptional() fillingStation?: string;
  @IsString() @IsOptional() notes?: string;
}
