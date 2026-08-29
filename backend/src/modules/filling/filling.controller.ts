import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { FillingService } from './filling.service';
import { CreateFillingDto } from './dto/create-filling.dto';
import { UpdateFillingDto } from './dto/update-filling.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('filling')
export class FillingController {
  constructor(private readonly fillingService: FillingService) {}

  @Get() findAll() { return this.fillingService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.fillingService.findOne(id); }
  @Post() create(@Body() dto: CreateFillingDto) { return this.fillingService.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateFillingDto) { return this.fillingService.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.fillingService.remove(id); }
}
