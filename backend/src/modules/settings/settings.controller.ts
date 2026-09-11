import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get() findAll() { return this.settingsService.findAll(); }
  @Get(':key') findByKey(@Param('key') key: string) { return this.settingsService.findByKey(key); }
  @Post() upsert(@Body() body: { key: string; value: string; description?: string }) {
    return this.settingsService.upsert(body.key, body.value, body.description);
  }
  @Post('bulk') bulkUpsert(@Body() body: { settings: { key: string; value: string }[] }) {
    return this.settingsService.bulkUpsert(body.settings);
  }
  @Delete(':id') remove(@Param('id') id: string) { return this.settingsService.remove(id); }
}
