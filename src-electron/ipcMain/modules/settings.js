import { ipcMain, dialog } from "electron";

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
}
