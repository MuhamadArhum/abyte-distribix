import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get() findAll(@Request() req: any) { return this.settingsService.findAll(req.user?.companyId); }
  @Get(':key') findByKey(@Param('key') key: string, @Request() req: any) { return this.settingsService.findByKey(key, req.user?.companyId); }
  @Post() upsert(@Body() body: { key: string; value: string; description?: string }, @Request() req: any) {
    return this.settingsService.upsert(body.key, body.value, req.user?.companyId, body.description);
  }
  @Post('bulk') bulkUpsert(@Body() body: { settings: { key: string; value: string }[] }, @Request() req: any) {
    return this.settingsService.bulkUpsert(body.settings, req.user?.companyId);
  }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: any) { return this.settingsService.remove(id, req.user?.companyId); }
}
