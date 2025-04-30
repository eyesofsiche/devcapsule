import { app, BrowserWindow, ipcMain } from "electron";
import os from "os";
import path from "path";

import { initDB, readDB } from "./db/lowdb.js";
import { registerAllIpcHandlers } from "./ipcMain/index.js";
import { startAutoProjectCount } from "./middleware";

if (process.env.NODE_ENV === "development") {
  app.name = "DevCapsule-dev";
} else {
  app.name = "DevCapsule";
}
console.log("process.env.NODE_ENV", process.env.NODE_ENV, app.name);

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

let mainWindow;

async function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, "icons/icon.png"), // tray icon
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
      webSecurity: true,
      allowRunningInsecureContent: false,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(process.env.APP_URL);

  if (process.env.NODE_ENV === "development") {
    try {
      const {
        default: installExtension,
        VUEJS_DEVTOOLS,
      } = require("electron-devtools-installer");
      installExtension(VUEJS_DEVTOOLS)
        .then((name) => {
          console.log(`✅ Vue DevTools installed: ${name}`);
          mainWindow.webContents.openDevTools();
        })
        .catch((err) => {
          console.error("❌ Vue DevTools 설치 실패:", err);
        });
    } catch (err) {
      console.error("❌ installExtension 로드 실패:", err);
    }
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await initDB();
  await createWindow();

  const db = await readDB();
  if (db.settings?.autoRefresh) {
    startAutoProjectCount();
  }

  await registerAllIpcHandlers();
});

// 창 컨트롤 IPC 핸들러
ipcMain.on("window:minimize", () => {
  mainWindow.minimize();
});

ipcMain.on("window:maximize", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on("window:close", () => {
  mainWindow.close();
});

app.on("window-all-closed", () => {
  if (platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
