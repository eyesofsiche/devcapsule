import {
  app,
  BrowserWindow,
  screen,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
} from "electron";
import windowStateKeeper from "electron-window-state";
import os from "os";
import path from "path";

import { initAllDB, readSection } from "./db/lowdb/index.js";
import { prepareGitAuthScript } from "./helpers/git.js";
import { registerAllIpcHandlers } from "./ipcMain/index.js";
import { scanner } from "./services/scanProject.js";
import { initAllWatchers } from "./services/watchingEnv.js";
import { getResourcesPublicPath } from "./utils/getPath.js";

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

let mainWindow;
let tray = null;
let isQuitting = false;

async function createWindow() {
  // 창 위치/크기 이전 상태 불러오기
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 700,
  });

  // 이전 상태에서 가져온 창 위치/크기
  let winBounds = {
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
  };

  // 💡 현재 모니터 안에 위치하는지 확인
  const isVisibleOnAnyDisplay = screen.getAllDisplays().some((display) => {
    const area = display.bounds;
    return (
      winBounds.x >= area.x &&
      winBounds.x < area.x + area.width &&
      winBounds.y >= area.y &&
      winBounds.y < area.y + area.height
    );
  });

  // ❗ 보이지 않는 위치라면 → 주 모니터 중앙으로 복구
  if (!isVisibleOnAnyDisplay) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height, x, y } = primaryDisplay.workArea;

    winBounds.x = x + Math.round((width - winBounds.width) / 2);
    winBounds.y = y + Math.round((height - winBounds.height) / 2);
  }

  // 브라우저 초기화
  mainWindow = new BrowserWindow({
    icon: path.resolve(__dirname, "icons/icon.png"), // tray icon
    ...winBounds,
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
  }

  mainWindow
    .on("closed", () => {
      mainWindow = null;
    })
    .on("close", (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
      if (process.platform === "darwin") {
        app.dock.hide();
      }
    });
}

app.whenReady().then(async () => {
  await initAllDB();
  await prepareGitAuthScript();
  await createWindow();
  await initAllWatchers();
  await registerAllIpcHandlers(mainWindow);

  const iconPath = getResourcesPublicPath("icons/icon_tray.png");
  const trayIcon = nativeImage.createFromPath(iconPath);
  trayIcon.setTemplateImage(true);

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "열기",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          if (process.platform === "darwin") {
            app.dock.show();
          }
        }
      },
    },
    {
      label: "종료",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("DevCapsule");
  tray.setContextMenu(contextMenu);

  globalShortcut.register("CommandOrControl+Shift+I", () => {
    if (!mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.webContents.closeDevTools();
    }
  });

  const settingsDB = await readSection("settings");
  if (settingsDB.autoRefresh) {
    scanner.startAuto();
  }
});

app.on("before-quit", (event) => {
  if (process.env.NODE_ENV === "development") {
    isQuitting = true;
    return;
  }
  if (!isQuitting) {
    event.preventDefault();
    if (mainWindow) mainWindow.hide();
    if (process.platform === "darwin") {
      app.dock.hide();
    }
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
