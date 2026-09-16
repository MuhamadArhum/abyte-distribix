import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class UpdateCylinderUnitDto {
  @IsString() @IsOptional() serialNumber?: string;
  @IsString() @IsOptional() cylinderTypeId?: string;
  @IsIn(['EMPTY', 'FILLED', 'WITH_CUSTOMER', 'DAMAGED', 'MAINTENANCE', 'LOST']) @IsOptional() status?: string;
  @IsString() @IsOptional() customerId?: string;
  @IsDateString() @IsOptional() purchaseDate?: string;
  @IsString() @IsOptional() notes?: string;
}
