import { Module } from '@nestjs/common';
import { FillingService } from './filling.service';
import { FillingController } from './filling.controller';

@Module({
  controllers: [FillingController],
  providers: [FillingService],
  exports: [FillingService],
})
export class FillingModule {}
