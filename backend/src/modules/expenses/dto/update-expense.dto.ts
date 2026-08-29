import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateExpenseDto {
  @IsNumber() @IsOptional() amount?: number;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() description?: string;
}
