import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { SSHService } from './services/SSHService.js'
import { ConfigService } from './services/ConfigService.js'

// const require = createRequire(import.meta.url) // Unused
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()

  // IPC Handlers
  const sshService = new SSHService();

  ipcMain.handle('ssh:connect', async (_, config) => {
    try {
      await sshService.connect(config);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ssh:list-files', async (_, folder) => {
    return await sshService.listFiles(folder);
  });

  ipcMain.handle('ssh:download', async (_, { baseUrl, resourcePath, destinationFolder, fileName }) => {
    await sshService.download(baseUrl, resourcePath, destinationFolder, fileName);
    return true;
  });

  ipcMain.handle('ssh:delete', async (_, { folder, fileName }) => {
    await sshService.deleteFile(folder, fileName);
    return true;
  });
  
  // Config Service
  const configService = new ConfigService(app.getPath('userData'));

  ipcMain.handle('config:get', async () => {
    return await configService.getConfig();
  });

  ipcMain.handle('config:save', async (_, config) => {
    await configService.saveConfig(config);
    return true;
  });

  ipcMain.handle('app:get-sources', async () => {
      // Find sources relative to app root or hardcoded dev path
      // In production it should be handled differently (bundled or adjacent)
      const specificSourcesDir = 'd:\\WF\\ssh_roms\\sources'; 
      try {
          const fs = await import('fs/promises');
          const files = await fs.readdir(specificSourcesDir);
          const jsonFiles = files.filter(f => f.endsWith('.json'));
          
          const result: Record<string, any> = {};
          for (const file of jsonFiles) {
              const content = await fs.readFile(path.join(specificSourcesDir, file), 'utf-8');
              result[file.replace('.json', '')] = JSON.parse(content);
          }
          return result;
      } catch (err) {
          console.error('Failed to load sources', err);
          return {};
      }
  });
})
