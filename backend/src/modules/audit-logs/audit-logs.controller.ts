import { Controller, Get, Query, Param, UseGuards, Request } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get() findAll(
    @Query('module') module?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.auditLogsService.findAll(req.user?.companyId, module, userId, page ? Number(page) : 1, limit ? Number(limit) : 200);
  }

  @Get('modules') getModules(@Request() req: any) { return this.auditLogsService.getModules(req.user?.companyId); }
  @Get(':id') findOne(@Param('id') id: string, @Request() req: any) { return this.auditLogsService.findOne(id, req.user?.companyId); }
}
