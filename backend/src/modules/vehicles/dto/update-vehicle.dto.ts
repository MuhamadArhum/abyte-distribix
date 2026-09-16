import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class UpdateVehicleDto {
  @IsString() @IsOptional() vehicleCode?: string;
  @IsString() @IsOptional() vehicleNumber?: string;
  @IsIn(['TRUCK', 'PICKUP', 'VAN']) @IsOptional() vehicleType?: string;
  @IsNumber() @IsOptional() capacity?: number;
  @IsIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE']) @IsOptional() status?: string;
}
