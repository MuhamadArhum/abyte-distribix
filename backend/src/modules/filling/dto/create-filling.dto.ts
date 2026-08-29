import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateFillingDto {
  @IsString() @IsNotEmpty() batchNumber: string;
  @IsDateString() fillingDate: string;
  @IsString() @IsNotEmpty() tankId: string;
  @IsString() @IsNotEmpty() cylinderTypeId: string;
  @IsNumber() numberOfCylinders: number;
  @IsNumber() expectedGasQty: number;
  @IsString() @IsOptional() operatorId?: string;
  @IsString() @IsOptional() fillingStation?: string;
  @IsString() @IsOptional() notes?: string;
}
