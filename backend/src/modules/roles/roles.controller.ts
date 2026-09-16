import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.rolesService.findAll(req.user?.companyId, search, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.rolesService.findOne(id, req.user?.companyId); }
  @Post() create(@Body() body: any, @Request() req: any) { return this.rolesService.create(body, req.user?.companyId, req.user?.userId); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any, @Request() req: any) { return this.rolesService.update(id, body, req.user?.companyId, req.user?.userId); }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.rolesService.remove(id, req.user?.companyId, req.user?.userId); }
}
