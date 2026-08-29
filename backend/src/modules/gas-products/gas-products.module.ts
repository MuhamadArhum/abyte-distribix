import { Module } from '@nestjs/common';
import { GasProductsService } from './gas-products.service';
import { GasProductsController } from './gas-products.controller';

@Module({
  controllers: [GasProductsController],
  providers: [GasProductsService],
  exports: [GasProductsService],
})
export class GasProductsModule {}
