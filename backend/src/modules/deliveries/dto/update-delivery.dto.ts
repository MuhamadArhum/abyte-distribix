import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class UpdateDeliveryDto {
  @IsString() @IsOptional() deliveryNumber?: string;
  @IsString() @IsOptional() customerId?: string;
  @IsString() @IsOptional() saleId?: string;
  @IsString() @IsOptional() driverId?: string;
  @IsString() @IsOptional() vehicleId?: string;
  @IsDateString() @IsOptional() deliveryDate?: string;
  @IsIn(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']) @IsOptional() status?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() notes?: string;
}
