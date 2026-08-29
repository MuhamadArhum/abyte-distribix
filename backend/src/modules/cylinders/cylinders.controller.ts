import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CylindersService } from './cylinders.service';
import { CreateCylinderTypeDto } from './dto/create-cylinder.dto';
import { UpdateCylinderTypeDto } from './dto/update-cylinder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cylinders')
export class CylindersController {
  constructor(private readonly cylindersService: CylindersService) {}

  @Get() findAll() { return this.cylindersService.findAllTypes(); }
  @Get('inventory') getInventory() { return this.cylindersService.getInventory(); }
  @Get('transactions') getTransactions() { return this.cylindersService.getTransactions(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.cylindersService.findOneType(id); }
  @Post() create(@Body() dto: CreateCylinderTypeDto) { return this.cylindersService.createType(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCylinderTypeDto) { return this.cylindersService.updateType(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.cylindersService.removeType(id); }
}
