import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateDriverDto {
  @IsString() @IsNotEmpty() driverCode: string;
  @IsString() @IsNotEmpty() fullName: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsString() @IsOptional() licenseNumber?: string;
  @IsString() @IsOptional() address?: string;
  @IsIn(['ACTIVE', 'INACTIVE']) @IsOptional() status?: string;
}
