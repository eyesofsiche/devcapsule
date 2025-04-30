import { ipcMain, dialog } from "electron";

import {
  getProjectCount,
  runFullScanFolder,
  startAutoProjectCount,
  stopAutoProjectCount,
} from "../../middleware/index.js";

export default function registerSettingsHandlers() {
  // 자동 새로고침 설정 변경
  ipcMain.on("cmd:change-auto-refresh", async (event, autoRefresh) => {
    try {
      if (autoRefresh) {
        startAutoProjectCount();
      } else {
        stopAutoProjectCount();
      }
    } catch (error) {
      console.error("Failed to update auto-refresh setting:", error);
    }
  });

  // 탐색기
  ipcMain.handle("dialog:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result.filePaths[0];
  });

  // 프로젝트 카운트
  ipcMain.on("cmd:get-project-count", async (event, { replyChannel, path }) => {
    console.log("cmd:get-project-count", path);
    try {
      const result = await getProjectCount(event, path);
      event.reply(replyChannel, { path, ...result });
    } catch (error) {
      event.reply(replyChannel, {
        path,
        success: false,
        error: error.message,
      });
    }
  });

  ipcMain.on("cmd:force-refresh", async (event, { replyChannel }) => {
    console.log("cmd:force-refresh");
    try {
      const result = await runFullScanFolder();
      console.log("result", result);
      event.reply(replyChannel, result);
    } catch (error) {
      event.reply(replyChannel, {
        success: false,
        error: error.message,
      });
    }
  });
}
