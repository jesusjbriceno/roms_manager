var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import { Client } from "ssh2";
import fs from "fs/promises";
import path from "path";
class SSHService {
  constructor() {
    __publicField(this, "client");
    __publicField(this, "isConnected", false);
    this.client = new Client();
  }
  connect(config) {
    return new Promise((resolve, reject) => {
      this.client = new Client();
      this.client.on("ready", () => {
        this.isConnected = true;
        resolve();
      }).on("error", (err) => {
        this.isConnected = false;
        reject(err);
      }).on("end", () => {
        this.isConnected = false;
      }).connect(config);
    });
  }
  disconnect() {
    if (this.isConnected) {
      this.client.end();
      this.isConnected = false;
    }
  }
  exec(command) {
    if (!this.isConnected) return Promise.reject(new Error("Not connected"));
    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) return reject(err);
        let output = "";
        let errorOutput = "";
        stream.on("close", (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            console.error("Command failed:", command, errorOutput);
            reject(new Error(errorOutput || `Command failed with code ${code}`));
          }
        }).on("data", (data) => {
          output += data.toString();
        }).stderr.on("data", (data) => {
          errorOutput += data.toString();
        });
      });
    });
  }
  async listFiles(folder) {
    try {
      const output = await this.exec(`ls -1 "${folder}"`);
      return output.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
    } catch (error) {
      return [];
    }
  }
  async download(baseUrl, resourcePath, destinationFolder, fileName) {
    const fullUrl = `${baseUrl}${resourcePath}`;
    const destinationPath = `${destinationFolder}/${fileName}`;
    await this.exec(`mkdir -p "${destinationFolder}" && wget -c "${fullUrl}" -O "${destinationPath}"`);
  }
  async deleteFile(folder, fileName) {
    const path2 = `${folder}/${fileName}`;
    await this.exec(`rm -f "${path2}"`);
  }
}
class ConfigService {
  constructor(userDataPath) {
    __publicField(this, "configPath");
    this.configPath = path.join(userDataPath, "config.json");
  }
  async getConfig() {
    try {
      const data = await fs.readFile(this.configPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  async saveConfig(config) {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), "utf-8");
  }
}
const currentDir = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(currentDir, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path$1.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path$1.join(currentDir, "preload.mjs"),
      // Use correct preload path
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  createWindow();
  const sshService = new SSHService();
  ipcMain.handle("ssh:connect", async (_, config) => {
    try {
      await sshService.connect(config);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle("ssh:list-files", async (_, folder) => {
    return await sshService.listFiles(folder);
  });
  ipcMain.handle("ssh:download", async (_, { baseUrl, resourcePath, destinationFolder, fileName }) => {
    await sshService.download(baseUrl, resourcePath, destinationFolder, fileName);
    return true;
  });
  ipcMain.handle("ssh:delete", async (_, { folder, fileName }) => {
    await sshService.deleteFile(folder, fileName);
    return true;
  });
  const configService = new ConfigService(app.getPath("userData"));
  ipcMain.handle("config:get", async () => {
    return await configService.getConfig();
  });
  ipcMain.handle("config:save", async (_, config) => {
    await configService.saveConfig(config);
    return true;
  });
  ipcMain.handle("app:get-sources", async () => {
    const specificSourcesDir = "d:\\WF\\ssh_roms\\sources";
    try {
      const fs2 = await import("fs/promises");
      const files = await fs2.readdir(specificSourcesDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      const result = {};
      for (const file of jsonFiles) {
        const content = await fs2.readFile(path$1.join(specificSourcesDir, file), "utf-8");
        result[file.replace(".json", "")] = JSON.parse(content);
      }
      return result;
    } catch (err) {
      console.error("Failed to load sources", err);
      return {};
    }
  });
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
