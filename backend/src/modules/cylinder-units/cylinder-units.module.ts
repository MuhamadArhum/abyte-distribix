import { Module } from '@nestjs/common';
import { CylinderUnitsController } from './cylinder-units.controller';
import { CylinderUnitsService } from './cylinder-units.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CylinderUnitsController],
  providers: [CylinderUnitsService],
})
export class CylinderUnitsModule {}
