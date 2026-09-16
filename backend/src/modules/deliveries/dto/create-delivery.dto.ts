import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateDeliveryDto {
  @IsString() @IsNotEmpty() deliveryNumber: string;
  @IsString() @IsNotEmpty() customerId: string;
  @IsString() @IsOptional() saleId?: string;
  @IsString() @IsOptional() driverId?: string;
  @IsString() @IsOptional() vehicleId?: string;
  @IsDateString() @IsNotEmpty() deliveryDate: string;
  @IsIn(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']) @IsOptional() status?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() notes?: string;
}
