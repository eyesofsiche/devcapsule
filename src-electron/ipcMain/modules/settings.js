import { exec } from "child_process";
import { ipcMain, dialog, shell } from "electron";
import os from "os";

import { checkUncommittedChanges } from "../../helpers/git.js";
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

  ipcMain.handle("cmd:open-vscode", async (_, folderPath) => {
    try {
      // macOS/Linux/Windows 모두 'code' 명령어 사용
      exec(`code "${folderPath}"`);
      return { success: true };
    } catch (err) {
      console.error("❌ open-vscode error:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("cmd:open-terminal", async (_, folderPath) => {
    try {
      const platform = os.platform();

      let command = "";
      if (platform === "darwin") {
        command = `open -a Terminal "${folderPath}"`;
      } else if (platform === "win32") {
        command = `start cmd.exe /K "cd /d ${folderPath}"`;
      } else if (platform === "linux") {
        command = `gnome-terminal --working-directory="${folderPath}"`;
      }

      exec(command);
      return { success: true };
    } catch (err) {
      console.error("❌ open-terminal error:", err);
      return { success: false, error: err.message };
    }
  });

  // 폴더 지우기
  ipcMain.on(
    "cmd:remove-folder-checker",
    async (event, { replyChannel, path }) => {
      try {
        // git 체크
        const result = await checkUncommittedChanges(path);
        event.reply(replyChannel, result);
      } catch (err) {
        event.reply(replyChannel, { success: false });
      }
    }
  );
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
