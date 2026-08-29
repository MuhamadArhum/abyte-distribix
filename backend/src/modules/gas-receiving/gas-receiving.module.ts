import { Module } from '@nestjs/common';
import { GasReceivingService } from './gas-receiving.service';
import { GasReceivingController } from './gas-receiving.controller';

@Module({
  controllers: [GasReceivingController],
  providers: [GasReceivingService],
  exports: [GasReceivingService],
})
export class GasReceivingModule {}
