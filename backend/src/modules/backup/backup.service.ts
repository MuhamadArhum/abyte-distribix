import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const AUTO_BACKUP_RETENTION = 30;

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private dbPath: string;
  private backupDir: string;

  constructor(private auditLogsService: AuditLogsService) {}

  onModuleInit() {
    const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
    const filePath = dbUrl.replace(/^file:/, '');
    // Prisma resolves relative file:// paths from the prisma/ schema directory
    const resolvedDirect = path.resolve(filePath);
    const resolvedFromPrisma = path.resolve('prisma', filePath);
    if (!fs.existsSync(resolvedDirect) && fs.existsSync(resolvedFromPrisma)) {
      this.dbPath = resolvedFromPrisma;
    } else {
      this.dbPath = resolvedDirect;
    }

    // Backup dir is sibling to the db file
    this.backupDir = path.join(path.dirname(this.dbPath), 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Auto-backup on startup (covers machines that aren't left running overnight)
    this.createAutoBackup('startup');
  }

  /**
   * Runs every day at 2 AM as long as the app is open. Combined with the
   * startup backup above, this gives coverage whether the distributor
   * leaves the app running overnight or closes it and reopens it daily.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  handleScheduledBackup() {
    this.logger.log('Running scheduled daily backup...');
    this.createAutoBackup('daily');
  }

  private createAutoBackup(label: 'startup' | 'daily') {
    if (!fs.existsSync(this.dbPath)) return;
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dest = path.join(this.backupDir, `auto-${label}-${timestamp}.db`);
      fs.copyFileSync(this.dbPath, dest);
      this.pruneOldBackups('auto-', AUTO_BACKUP_RETENTION);
    } catch (e) {
      this.logger.error('Auto-backup failed:', e as Error);
    }
  }

  private pruneOldBackups(prefix: string, keepCount: number) {
    const files = fs.readdirSync(this.backupDir)
      .filter((f) => f.endsWith('.db') && f.startsWith(prefix))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(this.backupDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    files.slice(keepCount).forEach((f) => {
      try { fs.unlinkSync(path.join(this.backupDir, f.name)); } catch {}
    });
  }

  async createBackup(label = 'manual', actorUserId?: string) {
    if (!fs.existsSync(this.dbPath)) throw new Error('Database file not found');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${label}-${timestamp}.db`;
    const dest = path.join(this.backupDir, filename);
    fs.copyFileSync(this.dbPath, dest);
    const stat = fs.statSync(dest);
    await this.auditLogsService.log({ userId: actorUserId, action: 'CREATE', module: 'Backup', newValue: { filename, size: stat.size } });
    return { filename, size: stat.size, createdAt: stat.mtime, backupDir: this.backupDir };
  }

  listBackups() {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs.readdirSync(this.backupDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => {
        const stat = fs.statSync(path.join(this.backupDir, f));
        return { filename: f, size: stat.size, createdAt: stat.mtime };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getBackupFilePath(filename: string) {
    // Reject anything that could reference a parent directory before it
    // even reaches path.join — a plain `startsWith(backupDir)` check can be
    // fooled by a sibling directory whose name happens to share the prefix
    // (e.g. "backups-evil"), so containment is verified via path.relative.
    if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      throw new BadRequestException('Invalid backup filename');
    }
    const filePath = path.join(this.backupDir, filename);
    const rel = path.relative(this.backupDir, filePath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new BadRequestException('Invalid path');
    }
    if (!fs.existsSync(filePath)) throw new Error('Backup file not found');
    return filePath;
  }

  async restoreBackup(filename: string, actorUserId?: string) {
    const src = this.getBackupFilePath(filename);
    // Save current DB as emergency backup before overwriting
    if (fs.existsSync(this.dbPath)) {
      const emergency = path.join(this.backupDir, `pre-restore-${Date.now()}.db`);
      fs.copyFileSync(this.dbPath, emergency);
    }
    fs.copyFileSync(src, this.dbPath);
    await this.auditLogsService.log({ userId: actorUserId, action: 'UPDATE', module: 'Backup', newValue: { restoredFrom: filename } });
    return { success: true, message: 'Database restored. Please restart the application.' };
  }

  async deleteBackup(filename: string, actorUserId?: string) {
    const filePath = this.getBackupFilePath(filename);
    fs.unlinkSync(filePath);
    await this.auditLogsService.log({ userId: actorUserId, action: 'DELETE', module: 'Backup', previousValue: { filename } });
    return { success: true };
  }

  getInfo() {
    const dbExists = fs.existsSync(this.dbPath);
    return {
      dbPath: this.dbPath,
      backupDir: this.backupDir,
      dbSize: dbExists ? fs.statSync(this.dbPath).size : 0,
      backupCount: this.listBackups().length,
      autoBackupRetention: AUTO_BACKUP_RETENTION,
      autoBackupEnabled: true,
      autoBackupSchedule: 'Daily at 2:00 AM (while the app is open), plus once on every startup',
    };
  }
}
