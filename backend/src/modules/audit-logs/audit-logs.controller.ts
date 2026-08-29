import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get() findAll(@Query('module') module?: string, @Query('userId') userId?: string) {
    return this.auditLogsService.findAll(module, userId);
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.auditLogsService.findOne(id); }
}
