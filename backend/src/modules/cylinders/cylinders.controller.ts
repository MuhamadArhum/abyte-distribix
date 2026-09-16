import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { CylindersService } from './cylinders.service';
import { CreateCylinderTypeDto } from './dto/create-cylinder.dto';
import { UpdateCylinderTypeDto } from './dto/update-cylinder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
@Controller('cylinders')
export class CylindersController {
  constructor(private readonly cylindersService: CylindersService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.cylindersService.findAllTypes(req.user?.companyId, {
      search, status,
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }
  @Get('summary') getSummary(@Request() req: any) { return this.cylindersService.getSummary(req.user?.companyId); }
  @Get('inventory') getInventory(@Request() req: any) { return this.cylindersService.getInventory(req.user?.companyId); }
  @Get('transactions') getTransactions(@Request() req: any) { return this.cylindersService.getTransactions(req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.cylindersService.findOneType(id, req.user?.companyId); }
  @Post() create(@Body() dto: CreateCylinderTypeDto, @Request() req: any) { return this.cylindersService.createType(dto, req.user?.companyId); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCylinderTypeDto, @Request() req: any) { return this.cylindersService.updateType(id, dto, req.user?.companyId); }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.cylindersService.removeType(id, req.user?.companyId); }
}
