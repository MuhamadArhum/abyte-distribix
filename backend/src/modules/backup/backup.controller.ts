import { Controller, Get, Post, Delete, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { BackupService } from './backup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('backup')
@UseGuards(JwtAuthGuard)
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
  create() {
    return this.backupService.createBackup('manual');
  }

  @Get('download/:filename')
  download(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.backupService.getBackupFilePath(filename);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  }

  @Post('restore/:filename')
  restore(@Param('filename') filename: string) {
    return this.backupService.restoreBackup(filename);
  }

  @Delete(':filename')
  remove(@Param('filename') filename: string) {
    return this.backupService.deleteBackup(filename);
  }
}
