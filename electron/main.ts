import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const BACKEND_PORT = 3001;
const FRONTEND_PORT = 5173;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const dbPath = path.join(app.getPath('userData'), 'abyte.db');
const backupDir = path.join(app.getPath('userData'), 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
}

function startBackend(): void {
  const backendPath = isDev
    ? path.join(__dirname, '../../backend')
    : path.join(process.resourcesPath, 'backend');

  backendProcess = spawn('node', ['dist/main.js'], {
    cwd: backendPath,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: `file:${dbPath}`,
    },
    stdio: 'pipe',
  });

  backendProcess.stdout?.on('data', (data) => {
    console.log('[Backend]', data.toString());
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error('[Backend Error]', data.toString());
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'AbyteDistribix - LPG Gas Distribution Management',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  const url = isDev
    ? `http://localhost:${FRONTEND_PORT}`
    : `file://${path.join(__dirname, '../../frontend/dist/index.html')}`;

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: openUrl }) => {
    shell.openExternal(openUrl);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ── Backup IPC Handlers ── */

ipcMain.handle('backup:export', async () => {
  const today = new Date().toISOString().split('T')[0];
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Database Backup',
    defaultPath: `abyte-backup-${today}.db`,
    filters: [{ name: 'AbyteDistribix Backup', extensions: ['db'] }],
  });
  if (canceled || !filePath) return { success: false, cancelled: true };
  try {
    if (!fs.existsSync(dbPath)) return { success: false, error: 'Database file not found' };
    fs.copyFileSync(dbPath, filePath);
    return { success: true, path: filePath };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('backup:import', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Select Backup File to Restore',
    filters: [{ name: 'AbyteDistribix Backup', extensions: ['db'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { success: false, cancelled: true };
  try {
    ensureBackupDir();
    // Save current DB as emergency backup
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(backupDir, `pre-restore-${Date.now()}.db`));
    }
    // Kill backend
    if (backendProcess) { backendProcess.kill(); backendProcess = null; }
    await new Promise((r) => setTimeout(r, 1200));
    fs.copyFileSync(filePaths[0], dbPath);
    // Restart backend
    startBackend();
    await new Promise((r) => setTimeout(r, 2500));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('backup:list', () => {
  ensureBackupDir();
  return fs.readdirSync(backupDir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

ipcMain.handle('backup:restore-auto', async (_, filename: string) => {
  const src = path.join(backupDir, filename);
  if (!fs.existsSync(src)) return { success: false, error: 'Backup not found' };
  if (!src.startsWith(backupDir)) return { success: false, error: 'Invalid path' };
  try {
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(backupDir, `pre-restore-${Date.now()}.db`));
    }
    if (backendProcess) { backendProcess.kill(); backendProcess = null; }
    await new Promise((r) => setTimeout(r, 1200));
    fs.copyFileSync(src, dbPath);
    startBackend();
    await new Promise((r) => setTimeout(r, 2500));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('backup:delete', (_, filename: string) => {
  const filePath = path.join(backupDir, filename);
  if (!fs.existsSync(filePath) || !filePath.startsWith(backupDir)) return { success: false };
  try { fs.unlinkSync(filePath); return { success: true }; } catch (e: any) { return { success: false, error: e.message }; }
});

ipcMain.handle('backup:info', () => ({
  dbPath,
  backupDir,
  dbExists: fs.existsSync(dbPath),
  dbSize: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
  backupCount: fs.existsSync(backupDir) ? fs.readdirSync(backupDir).filter((f) => f.endsWith('.db')).length : 0,
  isElectron: true,
}));

/* ── App Lifecycle ── */

app.whenReady().then(() => {
  ensureBackupDir();

  if (!isDev) {
    startBackend();
    setTimeout(createWindow, 2000);
  } else {
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (backendProcess) backendProcess.kill();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});
