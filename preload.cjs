const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronUpdater', {
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (_event, error) => callback(error));
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
});

contextBridge.exposeInMainWorld('electronPin', {
  enterPinMode: () => ipcRenderer.invoke('enter-pin-mode'),
  exitPinMode: () => ipcRenderer.invoke('exit-pin-mode'),
  onGlobalDoubleShift: (callback) => {
    ipcRenderer.on('global-double-shift', () => callback());
  },
});
