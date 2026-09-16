import { IsString, IsOptional } from 'class-validator';

export class UpdateRoleDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() permissions?: string;
}
