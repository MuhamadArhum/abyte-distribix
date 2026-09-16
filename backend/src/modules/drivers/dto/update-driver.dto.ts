import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateDriverDto {
  @IsString() @IsOptional() driverCode?: string;
  @IsString() @IsOptional() fullName?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() licenseNumber?: string;
  @IsString() @IsOptional() address?: string;
  @IsIn(['ACTIVE', 'INACTIVE']) @IsOptional() status?: string;
}
