import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { GasReceivingService } from './gas-receiving.service';
import { CreateGasReceivingDto } from './dto/create-gas-receiving.dto';
import { UpdateGasReceivingDto } from './dto/update-gas-receiving.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('gas-receiving')
export class GasReceivingController {
  constructor(private readonly gasReceivingService: GasReceivingService) {}

  @Get() findAll() { return this.gasReceivingService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.gasReceivingService.findOne(id); }
  @Post() create(@Body() dto: CreateGasReceivingDto) { return this.gasReceivingService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateGasReceivingDto) { return this.gasReceivingService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.gasReceivingService.remove(id); }
}
