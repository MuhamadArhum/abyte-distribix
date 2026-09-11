import { IsString, IsEmail, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { USER_ROLES } from './create-user.dto';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  password?: string;
}
