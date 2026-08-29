import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BackupService implements OnModuleInit {
  private dbPath: string;
  private backupDir: string;

  onModuleInit() {
    const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
    const filePath = dbUrl.replace(/^file:/, '');
    this.dbPath = path.resolve(filePath);

    // Backup dir is sibling to the db file
    this.backupDir = path.join(path.dirname(this.dbPath), 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Auto-backup on startup
    this.createAutoBackup();
  }

  private createAutoBackup() {
    if (!fs.existsSync(this.dbPath)) return;
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dest = path.join(this.backupDir, `auto-${timestamp}.db`);
      fs.copyFileSync(this.dbPath, dest);
      this.pruneOldBackups(10);
    } catch (e) {
      console.error('Auto-backup failed:', e);
    }
  }

  private pruneOldBackups(keepCount: number) {
    const files = fs.readdirSync(this.backupDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(this.backupDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    files.slice(keepCount).forEach((f) => {
      try { fs.unlinkSync(path.join(this.backupDir, f.name)); } catch {}
    });
  }

  createBackup(label = 'manual') {
    if (!fs.existsSync(this.dbPath)) throw new Error('Database file not found');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${label}-${timestamp}.db`;
    const dest = path.join(this.backupDir, filename);
    fs.copyFileSync(this.dbPath, dest);
    const stat = fs.statSync(dest);
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
    const filePath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filePath)) throw new Error('Backup file not found');
    // Prevent path traversal
    if (!filePath.startsWith(this.backupDir)) throw new Error('Invalid path');
    return filePath;
  }

  restoreBackup(filename: string) {
    const src = this.getBackupFilePath(filename);
    // Save current DB as emergency backup before overwriting
    if (fs.existsSync(this.dbPath)) {
      const emergency = path.join(this.backupDir, `pre-restore-${Date.now()}.db`);
      fs.copyFileSync(this.dbPath, emergency);
    }
    fs.copyFileSync(src, this.dbPath);
    return { success: true, message: 'Database restored. Please restart the application.' };
  }

  deleteBackup(filename: string) {
    const filePath = this.getBackupFilePath(filename);
    fs.unlinkSync(filePath);
    return { success: true };
  }

  getInfo() {
    const dbExists = fs.existsSync(this.dbPath);
    return {
      dbPath: this.dbPath,
      backupDir: this.backupDir,
      dbSize: dbExists ? fs.statSync(this.dbPath).size : 0,
      backupCount: this.listBackups().length,
    };
  }
}
