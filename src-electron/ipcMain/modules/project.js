import { ipcMain } from "electron";

import { analyzeProject } from "../../helpers/analyzeProject.js";
import { scanner } from "../../middleware/projectScan.js";

export default function registerProjectHandlers() {
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

  // 수동 새로고침
  ipcMain.on("cmd:manual-refresh", async (event, { replyChannel }) => {
    try {
      const result = await scanner.manualScan();
      event.reply(replyChannel, result);
    } catch (err) {
      event.reply(replyChannel, { success: false, error: err.message });
    }
  });

  ipcMain.on("cmd:project-info", async (event, { replyChannel, path }) => {
    try {
      const result = await analyzeProject(path);
      event.reply(replyChannel, result);
    } catch (err) {
      event.reply(replyChannel, { success: false });
    }
  });

  ipcMain.on("cmd:project-create", async (event, { replyChannel, path }) => {
    try {
      const info = await analyzeProject(path);
      const result = {
        path,
        info,
        success: true,
      };
      event.reply(replyChannel, result);
    } catch (err) {
      event.reply(replyChannel, { success: false });
    }
  });
}
