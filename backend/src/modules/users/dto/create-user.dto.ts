import { IsString, IsEmail, IsNotEmpty, IsOptional, IsBoolean, IsIn } from 'class-validator';

export const USER_ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'WAREHOUSE', 'SALES'];

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
