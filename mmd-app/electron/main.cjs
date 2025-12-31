const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'MMD Studio',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Permite cargar recursos locales (file://)
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '../dist/index.html'),
    protocol: 'file:',
    slashes: true,
  });

  mainWindow.loadURL(startUrl);

  // Open the DevTools in dev mode
  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Protocolo para cargar archivos locales de forma segura si webSecurity fuera true
  // protocol.registerFileProtocol('local-resource', (request, callback) => {
  //   const url = request.url.replace('local-resource://', '');
  //   try {
  //     return callback(decodeURIComponent(url));
  //   } catch (error) {
  //     console.error(error);
  //   }
  // });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============ IPC HANDLERS ============

// Abrir diálogo para seleccionar archivo
ipcMain.handle('dialog:openFile', async (_, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    ...options
  });
  if (canceled) {
    return null;
  } else {
    // Return objects with info that web File API usually has (name, path, size)
    const filePath = filePaths[0];
    const stats = fs.statSync(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stats.size
    };
  }
});

// Abrir diálogo para seleccionar carpeta (para modelos con texturas)
ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (canceled) {
    return null;
  } else {
    const dirPath = filePaths[0];
    // Listar archivos para encontrar PMX
    try {
      const files = fs.readdirSync(dirPath);
      const pmxFiles = files.filter(f => f.toLowerCase().endsWith('.pmx') || f.toLowerCase().endsWith('.pmd'));
      
      return {
        path: dirPath,
        name: path.basename(dirPath),
        files: files,
        pmxFiles: pmxFiles
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }
});
