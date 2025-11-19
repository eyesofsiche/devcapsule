import AutoLaunch from "auto-launch";
import { exec } from "child_process";
import { ipcMain, dialog, shell } from "electron";
import fs from "fs";
import os from "os";
import path from "path";

import { readSection, updateSection } from "../../db/lowdb/index.js";
import { checkUncommittedChanges } from "../../helpers/git.js";
import { settingGitRepo, testGitConnection } from "../../services/gitRepo.js";
import {
  excludeFolderList,
  updateProjectFileExists,
} from "../../services/updateProject.js";

const appLauncher = new AutoLaunch({
  name: "DevCapsule",
  path: process.execPath,
});

export default function registerSettingsHandlers() {
  // 자동 실행 설정
  ipcMain.handle("set:auto-launch", async (event, enable) => {
    if (enable) {
      await appLauncher.enable();
    } else {
      await appLauncher.disable();
    }
  });

  // 탐색기 (스마트 경로 fallback)
  ipcMain.handle("dialog:select-directory", async (event, requestedPath) => {
    let defaultPath = requestedPath;

    // 1️⃣ 요청 경로가 존재하는지 체크
    if (requestedPath) {
      try {
        const stats = fs.statSync(requestedPath);
        if (!stats.isDirectory()) {
          defaultPath = null; // 파일이면 무시
        }
      } catch (err) {
        // 2️⃣ 경로가 없으면 부모 디렉토리들을 순회하며 체크
        const parts = requestedPath.split(/[/\\]/);
        let foundPath = null;

        for (let i = parts.length - 1; i > 0; i--) {
          const testPath = parts.slice(0, i).join("/");
          try {
            const stats = fs.statSync(testPath);
            if (stats.isDirectory()) {
              foundPath = testPath;
              break;
            }
          } catch {
            continue;
          }
        }

        // 3️⃣ 부모도 없으면 OS 기본 경로로 fallback
        if (foundPath) {
          defaultPath = foundPath;
        } else {
          // 크로스 플랫폼 기본 경로 (Documents)
          defaultPath = path.join(os.homedir(), "Documents");
        }
      }
    } else {
      // 경로가 없으면 Documents
      defaultPath = path.join(os.homedir(), "Documents");
    }

    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      defaultPath: defaultPath,
      buttonLabel: "복원 위치 선택",
    });

    return result.filePaths[0];
  });

  // Finder/탐색기에서 폴더 열기
  ipcMain.handle("cmd:open-folder", async (_, folderPath) => {
    try {
      const result = await shell.openPath(folderPath);
      if (result) {
        console.error("❌ open-folder error:", result);
        return { success: false, error: result };
      }
      return { success: true };
    } catch (err) {
      console.error("❌ open-folder error:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("cmd:open-vscode", async (_, folderPath) => {
    const settings = await readSection("settings", "all");
    return new Promise((resolve) => {
      // 폴더 존재 여부 확인
      fs.stat(folderPath, (err, stats) => {
        if (err || !stats.isDirectory()) {
          const message = `존재하지 않는 폴더입니다: ${folderPath}`;
          console.error("❌ open-vscode error:", message);
          resolve({ success: false, error: message });
          return;
        }

        // 폴더가 있을 경우 VSCode 실행
        exec(
          `code "${folderPath}"`,
          {
            env: {
              ...process.env,
              PATH: settings.path || process.env.PATH, // 사용자 PATH 설정
            },
          },
          (error, stdout, stderr) => {
            if (error) {
              console.error("❌ open-vscode error:", error.message);
              resolve({ success: false, error: error.message });
            } else {
              resolve({ success: true });
            }
          }
        );
      });
    });
  });

  ipcMain.handle("cmd:open-terminal", async (_, folderPath) => {
    const platform = os.platform();
    let command = "";

    if (platform === "darwin") {
      command = `open -a Terminal "${folderPath}"`;
    } else if (platform === "win32") {
      command = `start cmd.exe /K "cd /d ${folderPath}"`;
    } else if (platform === "linux") {
      command = `gnome-terminal --working-directory="${folderPath}"`;
    }

    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ open-terminal error:", error.message);
          resolve({ success: false, error: error.message });
        } else {
          resolve({ success: true });
        }
      });
    });
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

  // 백업 저장소 세팅
  ipcMain.on(
    "cmd:backup-repo-settings",
    async (event, { replyChannel, path }) => {
      try {
        const result = await settingGitRepo(path);

        if (result.success) {
          // gitPath 저장 ✅
          await updateSection("settings", { gitPath: path });
        }

        event.reply(replyChannel, result);
      } catch (err) {
        event.reply(replyChannel, { success: false });
      }
    }
  );

  // 저장소 test
  ipcMain.on("cmd:backup-repo-test", async (event, { replyChannel, path }) => {
    try {
      const result = await testGitConnection(path);
      event.reply(replyChannel, result);
    } catch (err) {
      event.reply(replyChannel, {
        success: false,
        error: "알 수 없는 에러",
      });
    }
  });
}
