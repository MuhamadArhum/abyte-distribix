import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get() findAll() { return this.rolesService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.rolesService.findOne(id); }
  @Post() create(@Body() body: any) { return this.rolesService.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.rolesService.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.rolesService.remove(id); }
}
