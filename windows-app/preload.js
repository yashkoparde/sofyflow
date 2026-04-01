const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  sendAudioChunk: (chunk) => ipcRenderer.send('audio-chunk', chunk),
  onShortcutTriggered: (callback) => ipcRenderer.on('shortcut-trigger', () => callback())
});
