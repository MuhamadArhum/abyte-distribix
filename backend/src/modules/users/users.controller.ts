import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.usersService.findAll(req.user?.companyId, search, page ? Number(page) : undefined, limit ? Number(limit) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) { return this.usersService.findOne(id, req.user?.companyId); }

  @Post()
  create(@Body() dto: CreateUserDto, @Request() req: any) { return this.usersService.create(dto, req.user?.companyId, req.user?.userId); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req: any) { return this.usersService.update(id, dto, req.user?.companyId, req.user?.userId); }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) { return this.usersService.remove(id, req.user?.companyId, req.user?.userId); }
}
