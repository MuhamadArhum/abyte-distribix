import { Controller, Get, Post, Delete, Param, Res, Request, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

// Backup operates on the single shared database file underneath every
// tenant — a company-level ADMIN is NOT authorized here, only the platform
// super-admin, or every company's admin could read/restore/delete every
// other company's data (see audit finding SEC-02).
@Controller('backup')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('info')
  getInfo() {
    return this.backupService.getInfo();
  }

  @Get('list')
  list() {
    return this.backupService.listBackups();
  }

  @Post('create')
  create(@Request() req: any) {
    return this.backupService.createBackup('manual', req.user?.userId);
  }

  @Get('download/:filename')
  download(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.backupService.getBackupFilePath(filename);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  }

  @Post('restore/:filename')
  restore(@Param('filename') filename: string, @Request() req: any) {
    return this.backupService.restoreBackup(filename, req.user?.userId);
  }

  @Delete(':filename')
  remove(@Param('filename') filename: string, @Request() req: any) {
    return this.backupService.deleteBackup(filename, req.user?.userId);
  }
}
