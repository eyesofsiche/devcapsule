import { ipcMain, dialog, shell } from "electron";

import {
  excludeFolderList,
  updateProjectFileExists,
} from "../../services/updateProject.js";

export default function registerSettingsHandlers() {
  // 탐색기
  ipcMain.handle("dialog:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result.filePaths[0];
  });

  // Finder/탐색기에서 폴더 열기
  ipcMain.handle("cmd:open-folder", async (_, folderPath) => {
    try {
      await shell.openPath(folderPath);
      return { success: true };
    } catch (err) {
      console.error("❌ open-folder error:", err);
      return { success: false, error: err.message };
    }
  });

  // 폴더 지우기
  ipcMain.handle("cmd:remove-folder", async (_, { folderPath, projectId }) => {
    try {
      await shell.trashItem(folderPath);
      if (projectId) {
        await updateProjectFileExists(projectId);
      }
      await excludeFolderList(folderPath);
      return { success: true };
    } catch (err) {
      console.error("❌ open-folder error:", err);
      return { success: false, error: err.message };
    }
  });
}
