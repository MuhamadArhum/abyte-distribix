import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsPositive } from 'class-validator';

export class CreateExpenseDto {
  @IsString() @IsNotEmpty() expenseNumber: string;
  @IsString() @IsNotEmpty() category: string;
  @IsDateString() expenseDate: string;
  @IsNumber() @IsPositive() amount: number;
  @IsString() @IsOptional() paymentMethod?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() attachment?: string;
  @IsString() @IsOptional() createdById?: string;
}
