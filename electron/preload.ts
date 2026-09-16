import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
  isElectron: true,

  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_event, action) => callback(action));
  },
  removeMenuActionListener: () => {
    ipcRenderer.removeAllListeners('menu-action');
  },

  // Backup & Restore — every call carries the renderer's current JWT so the
  // main process can independently verify super-admin status against the
  // running backend before touching the database file. A hidden button in
  // the renderer is not access control; this check is.
  backup: {
    export: (token: string) => ipcRenderer.invoke('backup:export', token),
    import: (token: string) => ipcRenderer.invoke('backup:import', token),
    list: (token: string) => ipcRenderer.invoke('backup:list', token),
    restoreAuto: (token: string, filename: string) => ipcRenderer.invoke('backup:restore-auto', token, filename),
    delete: (token: string, filename: string) => ipcRenderer.invoke('backup:delete', token, filename),
    info: (token: string) => ipcRenderer.invoke('backup:info', token),
  },
});
