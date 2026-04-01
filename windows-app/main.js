const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400, height: 600, frame: false, transparent: true, alwaysOnTop: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  mainWindow.loadURL('http://localhost:5173');
  globalShortcut.register('Space', () => {
    mainWindow.webContents.send('shortcut-trigger');
  });
}
app.whenReady().then(createWindow);
