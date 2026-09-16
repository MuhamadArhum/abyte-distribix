import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { FillingService } from './filling.service';
import { CreateFillingDto } from './dto/create-filling.dto';
import { UpdateFillingDto } from './dto/update-filling.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
@Controller('filling')
export class FillingController {
  constructor(private readonly fillingService: FillingService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.fillingService.findAll(req.user?.companyId, {
      search, status, from, to,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
  @Get('summary') getSummary(@Request() req: any) { return this.fillingService.getSummary(req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.fillingService.findOne(id, req.user?.companyId); }
  @Post() create(@Body() dto: CreateFillingDto, @Request() req: any) { return this.fillingService.create(dto, req.user?.companyId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateFillingDto, @Request() req: any) { return this.fillingService.update(id, dto, req.user?.companyId); }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.fillingService.remove(id, req.user?.companyId); }
}
