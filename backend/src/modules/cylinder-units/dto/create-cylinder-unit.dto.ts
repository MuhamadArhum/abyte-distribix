import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateCylinderUnitDto {
  @IsString() @IsNotEmpty() serialNumber: string;
  @IsString() @IsNotEmpty() cylinderTypeId: string;
  @IsIn(['EMPTY', 'FILLED', 'WITH_CUSTOMER', 'DAMAGED', 'MAINTENANCE', 'LOST']) @IsOptional() status?: string;
  @IsString() @IsOptional() customerId?: string;
  @IsDateString() @IsOptional() purchaseDate?: string;
  @IsString() @IsOptional() notes?: string;
}
