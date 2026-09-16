import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAdjustmentDto {
  @IsString() @IsNotEmpty() tankId: string;
  @IsNumber() quantity: number;
  @IsString() @IsOptional() notes?: string;
}
