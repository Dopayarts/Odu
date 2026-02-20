
const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { uIOhook, UiohookKey } = require('uiohook-napi');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let win = null;
let savedBounds = null;
let pinModeActive = false;

// --- Global keyboard hook for pin mode (bracket shortcuts + double-shift) ---

// Yoruba vowel accent maps
const VOWEL_GRAVE = {
  'a': 'à', 'e': 'è', 'i': 'ì', 'o': 'ò', 'u': 'ù', 'n': 'ǹ',
  'A': 'À', 'E': 'È', 'I': 'Ì', 'O': 'Ò', 'U': 'Ù', 'N': 'Ǹ',
  'ẹ': 'ẹ̀', 'ọ': 'ọ̀', 'Ẹ': 'Ẹ̀', 'Ọ': 'Ọ̀',
};
const VOWEL_ACUTE = {
  'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú', 'n': 'ń',
  'A': 'Á', 'E': 'É', 'I': 'Í', 'O': 'Ó', 'U': 'Ú', 'N': 'Ń',
  'ẹ': 'ẹ́', 'ọ': 'ọ́', 'Ẹ': 'Ẹ́', 'Ọ': 'Ọ́',
};

// Map uiohook keycodes to vowel characters
const KEYCODE_TO_VOWEL = {};
KEYCODE_TO_VOWEL[UiohookKey.A] = 'a';
KEYCODE_TO_VOWEL[UiohookKey.E] = 'e';
KEYCODE_TO_VOWEL[UiohookKey.I] = 'i';
KEYCODE_TO_VOWEL[UiohookKey.O] = 'o';
KEYCODE_TO_VOWEL[UiohookKey.U] = 'u';
KEYCODE_TO_VOWEL[UiohookKey.N] = 'n';

let lastTypedVowel = '';
let lastShiftTimeGlobal = 0;
let hookStarted = false;

// VBScript helper for sending keystrokes to external apps (Windows)
const vbsPath = path.join(os.tmpdir(), 'odu-sendkeys.vbs');
fs.writeFileSync(vbsPath, `Set WshShell = CreateObject("WScript.Shell")\r\nWScript.Sleep 30\r\nWshShell.SendKeys WScript.Arguments(0)\r\n`);

function sendKeysToActiveApp(keys) {
  execFile('cscript', ['//nologo', '//B', vbsPath, keys], { windowsHide: true }, (err) => {
    if (err) log.warn('SendKeys error:', err.message);
  });
}

function startGlobalHook() {
  if (hookStarted) return;
  hookStarted = true;
  lastTypedVowel = '';

  uIOhook.on('keydown', (e) => {
    if (!pinModeActive) return;
    // Skip when ODU window is focused — in-app handlers cover it
    if (win && win.isFocused()) return;

    const shiftHeld = e.shiftKey;

    // Track vowels
    if (KEYCODE_TO_VOWEL[e.keycode]) {
      lastTypedVowel = shiftHeld
        ? KEYCODE_TO_VOWEL[e.keycode].toUpperCase()
        : KEYCODE_TO_VOWEL[e.keycode];
      return;
    }

    // Bracket shortcuts: [ for grave, ] for acute
    if (e.keycode === UiohookKey.BracketLeft || e.keycode === UiohookKey.BracketRight) {
      if (lastTypedVowel) {
        const map = e.keycode === UiohookKey.BracketLeft ? VOWEL_GRAVE : VOWEL_ACUTE;
        const replacement = map[lastTypedVowel];
        if (replacement) {
          // Save clipboard, inject accented char, restore clipboard
          const savedClip = clipboard.readText();
          clipboard.writeText(replacement);
          // Send: Backspace (delete the bracket — it may have been typed already),
          // Backspace (delete the vowel), Ctrl+V (paste accented char)
          sendKeysToActiveApp('{BS}{BS}^v');
          setTimeout(() => clipboard.writeText(savedClip), 600);
          lastTypedVowel = replacement;
          return;
        }
      }
      lastTypedVowel = '';
      return;
    }

    // Double-shift detection
    if (e.keycode === UiohookKey.ShiftLeft || e.keycode === UiohookKey.ShiftRight) {
      const now = Date.now();
      const diff = now - lastShiftTimeGlobal;
      if (diff > 20 && diff < 350) {
        // Notify renderer to toggle tone mode
        if (win) win.webContents.send('global-double-shift');
      }
      lastShiftTimeGlobal = now;
      return;
    }

    // Any other key resets the vowel tracker
    lastTypedVowel = '';
  });

  uIOhook.start();
  log.info('Global keyboard hook started');
}

function stopGlobalHook() {
  if (!hookStarted) return;
  hookStarted = false;
  uIOhook.stop();
  log.info('Global keyboard hook stopped');
}

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

  // Send any pending update info once the page finishes loading
  win.webContents.on('did-finish-load', () => {
    if (pendingUpdateInfo) {
      win.webContents.send('update-available', pendingUpdateInfo);
      pendingUpdateInfo = null;
    }
  });

  // Optional: Open DevTools for debugging during development
  // win.webContents.openDevTools();
}

// --- Auto-updater events → forward to renderer ---

let pendingUpdateInfo = null;

autoUpdater.on('update-available', (info) => {
  if (win && !win.webContents.isLoading()) {
    win.webContents.send('update-available', info);
  } else {
    pendingUpdateInfo = info;
  }
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

ipcMain.handle('enter-pin-mode', () => {
  if (!win) return;
  savedBounds = win.getBounds();
  win.setMinimumSize(300, 250);
  win.setSize(420, 400);
  win.setAlwaysOnTop(true);
  pinModeActive = true;
  startGlobalHook();
});

ipcMain.handle('exit-pin-mode', () => {
  if (!win) return;
  pinModeActive = false;
  stopGlobalHook();
  win.setAlwaysOnTop(false);
  win.setMinimumSize(480, 500);
  if (savedBounds) {
    win.setBounds(savedBounds);
    savedBounds = null;
  }
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
  stopGlobalHook();
  if (process.platform !== 'darwin') app.quit();
});
