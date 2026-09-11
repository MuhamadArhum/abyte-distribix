import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get() findAll(@Query('module') module?: string, @Query('userId') userId?: string) {
    return this.auditLogsService.findAll(module, userId);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.auditLogsService.findOne(id); }
}
