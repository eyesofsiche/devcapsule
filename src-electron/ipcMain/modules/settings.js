import { ipcMain, dialog } from "electron";

import { scanner } from "../../middleware/projectScan.js";

export default function registerSettingsHandlers() {
  // 탐색기
  ipcMain.handle("dialog:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result.filePaths[0];
  });

  // 자동 새로고침 설정 변경
  ipcMain.on("cmd:change-auto-refresh", async (event, flag) => {
    if (flag) {
      scanner.startAuto();
    } else {
      scanner.stopAuto();
    }
  });

  // 감시폴더 추가시 프로젝트 스캔
  ipcMain.on("cmd:scan-project", async (event, { replyChannel, path }) => {
    try {
      const data = await scanner.scanFolder(path);
      event.reply(replyChannel, { path, ...data });
    } catch (err) {
      event.reply(replyChannel, { path, success: false, error: err.message });
    }
  });

  ipcMain.on("cmd:manual-refresh", async (event, { replyChannel }) => {
    try {
      const result = await scanner.manualScan();
      event.reply(replyChannel, result);
    } catch (err) {
      event.reply(replyChannel, { success: false, error: err.message });
    }
  });
}
