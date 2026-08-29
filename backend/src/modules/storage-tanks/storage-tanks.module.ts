import { Module } from '@nestjs/common';
import { StorageTanksService } from './storage-tanks.service';
import { StorageTanksController } from './storage-tanks.controller';

@Module({
  controllers: [StorageTanksController],
  providers: [StorageTanksService],
  exports: [StorageTanksService],
})
export class StorageTanksModule {}
