import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  // Unauthenticated on purpose — this is what the pre-login company
  // selector calls, before anyone has a JWT.
  @Get('public')
  findPublic() {
    return this.companiesService.findPublic();
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post()
  create(@Body() dto: CreateCompanyDto, @Request() req: any) {
    return this.companiesService.create(dto, req.user?.userId);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @Request() req: any) {
    return this.companiesService.update(id, dto, req.user?.userId);
  }
}
