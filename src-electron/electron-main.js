import { app, BrowserWindow, ipcMain } from "electron";
import windowStateKeeper from "electron-window-state";
import os from "os";
import path from "path";

import { initDB, readDB } from "./db/lowdb.js";
import { registerAllIpcHandlers } from "./ipcMain/index.js";
import { scanner } from "./services/scanProject.js";

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
  // 창 위치/크기 이전 상태 불러오기
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 700,
  });

  // 브라우저 초기화
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, "icons/icon.png"), // tray icon
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
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

  // 창 위치/크기 저장
  mainWindowState.manage(mainWindow);

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
  await registerAllIpcHandlers();

  const db = await readDB();
  if (db.settings?.autoRefresh) {
    scanner.startAuto();
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
