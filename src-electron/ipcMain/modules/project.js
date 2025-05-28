import { ipcMain } from "electron";

import { analyzeProject } from "../../helpers/analyzeProject.js";
import { registerProject } from "../../services/registerProject.js";
import { removeProject } from "../../services/removeProject.js";
import { scanner } from "../../services/scanProject.js";
import { updateProject } from "../../services/updateProject.js";

export default function registerProjectHandlers(mainWindow) {
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
  ipcMain.handle("cmd:manual-refresh", async () => {
    const result = await scanner.manualScan();
    return result;
  });

  ipcMain.on("cmd:info-project", async (event, { replyChannel, path }) => {
    try {
      const result = await analyzeProject(path);
      event.reply(replyChannel, result);
    } catch (err) {
      event.reply(replyChannel, { success: false });
    }
  });

  ipcMain.on(
    "cmd:create-project",
    async (event, { replyChannel, path, name }) => {
      try {
        const result = await registerProject(path, name);
        event.reply(replyChannel, result);
      } catch (err) {
        event.reply(replyChannel, { success: false, error: err.message });
      }
    }
  );

  ipcMain.on(
    "cmd:update-project-name",
    async (event, { replyChannel, id, name }) => {
      try {
        await updateProject({ id, name });
        event.reply(replyChannel, { success: true });
      } catch (err) {
        event.reply(replyChannel, { success: false, error: err.message });
      }
    }
  );

  ipcMain.on("cmd:remove-project", async (event, { replyChannel, id }) => {
    try {
      const result = await removeProject(id);

      event.reply(replyChannel, result);
    } catch (err) {
      event.reply(replyChannel, { success: false });
    }
  });
}
