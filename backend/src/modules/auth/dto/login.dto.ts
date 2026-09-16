import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  // Omitted for the super-admin login path; required for a normal company login.
  @IsOptional()
  @IsString()
  companyId?: string;
}
