import { app, BrowserWindow, dialog, ipcMain } from "electron";
import os from "os";
import path from "path";

import {
  initDB,
  readDB,
  writeDB,
  updateDBSection,
  getDBFilePath,
} from "./db/lowdb.js";
import { getProjectCount } from "./middleware";

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
  await initDB();
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

app.whenReady().then(createWindow);

ipcMain.handle("lowdb:get", async () => {
  try {
    return await readDB();
  } catch (err) {
    console.error("❌ Failed to read lowdb:", err);
    return null; // 또는 빈 객체 {}, 오류 신호 반환
  }
});

ipcMain.handle("lowdb:set", async (event, data) => {
  try {
    await updateDBSection(data.key, data.value);
    return true;
  } catch (err) {
    console.error("❌ Failed to update lowdb:", err);
    return false;
  }
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

// IPC 핸들러 등록
ipcMain.handle("dialog:openDirectory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result.filePaths[0];
});

ipcMain.on("cmd:get-project-count", async (event, folderPath) => {
  console.log("cmd:get-project-count", folderPath);
  try {
    const result = await getProjectCount(event, folderPath);
    event.reply("cmd:project-count-result", { path: folderPath, ...result });
  } catch (error) {
    event.reply("cmd:project-count-result", {
      path: folderPath,
      success: false,
      error: error.message,
    });
  }
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
