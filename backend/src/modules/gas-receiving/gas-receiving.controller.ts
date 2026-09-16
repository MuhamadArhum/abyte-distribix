import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { GasReceivingService } from './gas-receiving.service';
import { CreateGasReceivingDto } from './dto/create-gas-receiving.dto';
import { UpdateGasReceivingDto } from './dto/update-gas-receiving.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
@Controller('gas-receiving')
export class GasReceivingController {
  constructor(private readonly gasReceivingService: GasReceivingService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.gasReceivingService.findAll(req.user?.companyId, {
      search, from, to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
  @Get('summary') getSummary(@Request() req: any) { return this.gasReceivingService.getSummary(req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.gasReceivingService.findOne(id, req.user?.companyId); }
  @Post() create(@Body() dto: CreateGasReceivingDto, @Request() req: any) { return this.gasReceivingService.create(dto, req.user?.companyId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateGasReceivingDto, @Request() req: any) { return this.gasReceivingService.update(id, dto, req.user?.companyId); }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.gasReceivingService.remove(id, req.user?.companyId); }
}
