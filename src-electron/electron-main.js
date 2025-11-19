import {
  app,
  BrowserWindow,
  screen,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  powerMonitor,
} from "electron";
import windowStateKeeper from "electron-window-state";
import os from "os";
import path from "path";

import { initAllDB, readSection } from "./db/lowdb/index.js";
import { prepareGitAuthScript } from "./helpers/git.js";
import { registerAllIpcHandlers } from "./ipcMain/index.js";
import { checkGitStatus, pullEnvs } from "./services/gitRepo.js";
import { gitSyncManager } from "./services/gitSyncManager.js";
import { scanner } from "./services/scanProject.js";
import { initAllWatchers } from "./services/watchingEnv.js";
import { getResourcesPublicPath } from "./utils/getPath.js";
import { checkNetworkConnection } from "./utils/networkCheck.js";

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
          // console.log(
          //   `✅ Vue DevTools installed: ${JSON.stringify(name, 0, 2)}`
          // );
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
        if (process.platform === "darwin") {
          app.dock.hide();
        }
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

  // 시스템 종료/재시작 이벤트를 감지
  powerMonitor.on("shutdown", () => {
    isQuitting = true;
  });

  // 개발 환경에서만 전역 단축키 등록
  if (process.env.NODE_ENV === "development") {
    globalShortcut.register("CommandOrControl+Shift+I", () => {
      if (!mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.openDevTools();
      } else {
        mainWindow.webContents.closeDevTools();
      }
    });
  }

  const settingsDB = await readSection("settings");
  if (settingsDB.autoRefresh) {
    scanner.startAuto();
  }

  // Git 동기화 초기화 (오프라인이면 최대 5번 재시도)
  let networkRetryCount = 0;
  const MAX_NETWORK_RETRIES = 5; // 총 5번 시도
  const RETRY_INTERVAL = 5 * 60 * 1000; // 5분

  const initializeGitSync = async () => {
    // Git 설정이 없으면 체크 안 함
    if (!settingsDB.gitPath) {
      console.log("⚠️ Git 저장소 미설정 - 동기화 스킵");
      return;
    }

    const isOnline = await checkNetworkConnection();
    console.log(
      `🌐 네트워크 상태: ${isOnline ? "온라인" : "오프라인"} (시도 ${
        networkRetryCount + 1
      }/${MAX_NETWORK_RETRIES})`
    );

    if (isOnline) {
      // ✅ 온라인: Git 초기 동기화 & 주기적 체크 시작
      const gitCheck = await checkGitStatus();
      if (gitCheck.hasChanges) {
        await pullEnvs();
      }

      gitSyncManager.start();
      console.log("✅ Git 동기화 시작");
    } else {
      // ❌ 오프라인: 재시도 또는 포기
      networkRetryCount += 1;

      if (networkRetryCount < MAX_NETWORK_RETRIES) {
        console.log(`⏳ ${RETRY_INTERVAL / 1000 / 60}분 후 재시도...`);
        setTimeout(initializeGitSync, RETRY_INTERVAL);
      } else {
        console.log("⚠️ 오프라인 모드로 전환 (5번 시도 실패)");
        // TODO: UI에 오프라인 상태 알림
      }
    }
  };

  initializeGitSync();
});

app.on("before-quit", (event) => {
  if (process.env.NODE_ENV === "development") {
    isQuitting = true;
    return;
  }

  // 사용자가 Cmd+Q를 누르거나 메뉴에서 종료를 선택한 경우만 막음
  // 시스템 종료/재시동은 막지 않음 (app.quit()가 호출되었을 때만 isQuitting이 true)
  if (!isQuitting) {
    event.preventDefault();
    if (mainWindow) mainWindow.hide();
    if (process.platform === "darwin") {
      app.dock.hide();
    }
  }
});

// 시스템 종료 등으로 실제 종료가 확정되었을 때
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
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
