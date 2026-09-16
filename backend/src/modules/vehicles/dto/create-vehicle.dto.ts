import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateVehicleDto {
  @IsString() @IsNotEmpty() vehicleCode: string;
  @IsString() @IsNotEmpty() vehicleNumber: string;
  @IsIn(['TRUCK', 'PICKUP', 'VAN']) @IsOptional() vehicleType?: string;
  @IsNumber() @IsOptional() capacity?: number;
  @IsIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE']) @IsOptional() status?: string;
}
