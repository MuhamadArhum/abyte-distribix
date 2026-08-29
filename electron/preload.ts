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

  // Backup & Restore
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
    list: () => ipcRenderer.invoke('backup:list'),
    restoreAuto: (filename: string) => ipcRenderer.invoke('backup:restore-auto', filename),
    delete: (filename: string) => ipcRenderer.invoke('backup:delete', filename),
    info: () => ipcRenderer.invoke('backup:info'),
  },
});
