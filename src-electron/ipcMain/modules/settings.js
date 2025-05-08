import { ipcMain, dialog } from "electron";

export default function registerSettingsHandlers() {
  // 탐색기
  ipcMain.handle("dialog:openDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result.filePaths[0];
  });
}
