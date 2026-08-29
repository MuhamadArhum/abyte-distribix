import { Module } from '@nestjs/common';
import { CylindersService } from './cylinders.service';
import { CylindersController } from './cylinders.controller';

@Module({
  controllers: [CylindersController],
  providers: [CylindersService],
  exports: [CylindersService],
})
export class CylindersModule {}
