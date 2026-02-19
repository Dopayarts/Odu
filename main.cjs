
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let win = null;

// Don't auto-download — let the user decide
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 900,
    minWidth: 480,
    minHeight: 500,
    title: "ODÙ Yorùbá Writer",
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Load the Vite-built output from dist/
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Optional: Open DevTools for debugging during development
  // win.webContents.openDevTools();
}

// --- Auto-updater events → forward to renderer ---

autoUpdater.on('update-available', (info) => {
  if (win) win.webContents.send('update-available', info);
});

autoUpdater.on('download-progress', (progress) => {
  if (win) win.webContents.send('update-download-progress', progress);
});

autoUpdater.on('update-downloaded', (info) => {
  if (win) win.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (err) => {
  if (win) win.webContents.send('update-error', err?.message || String(err));
});

// --- IPC handlers from renderer ---

ipcMain.handle('check-for-updates', () => {
  autoUpdater.checkForUpdates().catch(() => {});
});

ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate().catch(() => {});
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// --- App lifecycle ---

app.whenReady().then(() => {
  createWindow();

  // Check for updates on launch (silently)
  autoUpdater.checkForUpdates().catch(() => {});

  // Re-check every 30 minutes
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 30 * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
