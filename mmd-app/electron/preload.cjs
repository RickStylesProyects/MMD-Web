const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  isElectron: true
});
