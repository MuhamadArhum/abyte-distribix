import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { StorageTanksService } from './storage-tanks.service';
import { CreateStorageTankDto } from './dto/create-storage-tank.dto';
import { UpdateStorageTankDto } from './dto/update-storage-tank.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('storage-tanks')
export class StorageTanksController {
  constructor(private readonly storageTanksService: StorageTanksService) {}

  @Get() findAll() { return this.storageTanksService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.storageTanksService.findOne(id); }
  @Post() create(@Body() dto: CreateStorageTankDto) { return this.storageTanksService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateStorageTankDto) { return this.storageTanksService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.storageTanksService.remove(id); }
}
