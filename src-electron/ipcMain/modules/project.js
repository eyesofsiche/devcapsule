import { ipcMain } from "electron";
import { existsSync } from "fs";

import { readSection } from "../../db/lowdb/index.js";
import { analyzeProject } from "../../helpers/analyzeProject.js";
import { registerProject } from "../../services/registerProject.js";
import { removeProject } from "../../services/removeProject.js";
import { restoreProject } from "../../services/restoreProject.js";
import { scanner } from "../../services/scanProject.js";
import { updateProject } from "../../services/updateProject.js";
import { updateProjectFileExists } from "../../services/updateProject.js";

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

  ipcMain.handle("cmd:info-project", async (event, { id }) => {
    const projects = await readSection("projects");
    const project = projects.find((p) => p.id === id);
    // DB 정보 전송
    event.sender.send("event:info-project-updated", {
      type: "cache",
      data: project,
    });

    // 파일이 존재하는 경우에만 분석
    if (project.isFileExists) {
      // 1) 경로 존재 여부 우선 확인 (DevCapsule 미실행 중 삭제/이동 대응)
      if (!existsSync(project.path)) {
        await updateProjectFileExists(project.id);
        const updated = { ...project, isFileExists: false };
        event.sender.send("event:info-project-updated", {
          type: "updated",
          data: updated,
        });
        return;
      }

      const updated = await analyzeProject(project.path);
      updateProject({ ...updated, id }, false);

      // 새로운 분석 정보 전송
      event.sender.send("event:info-project-updated", {
        type: "updated",
        data: updated,
      });
    }
  });

  ipcMain.on("cmd:info-project", async (event, { replyChannel, path }) => {
    try {
      const result = await analyzeProject(path);

      // 끊어진 프로젝트 재연결 후보 탐색 로직 추가
      const projects = await readSection("projects");
      const disconnected = (projects || []).filter(
        (p) => p && p.isFileExists === false
      );

      const normalizeUrl = (u) => {
        if (!u || typeof u !== "string") return null;
        let s = u.trim();
        // ssh 형태 git@github.com:owner/repo(.git)
        if (s.startsWith("git@")) {
          const m = s.match(/^git@([^:]+):(.+)$/);
          if (m) s = `${m[1]}/${m[2]}`;
        }
        s = s.replace(/^ssh:\/\//i, "");
        s = s.replace(/^https?:\/\//i, "");
        s = s.replace(/\.git$/i, "");
        return s.toLowerCase();
      };

      const newRemoteNorms = (result.git?.remotes || [])
        .map((r) => normalizeUrl(r?.url))
        .filter(Boolean);

      let matched = null;
      // 1) Remote URL 매칭 우선
      if (newRemoteNorms.length > 0) {
        matched = disconnected.find((p) => {
          const olds = (p.git?.remotes || [])
            .map((r) => normalizeUrl(r?.url))
            .filter(Boolean);
          return olds.some((u) => newRemoteNorms.includes(u));
        });
      }

      // 2) 이름 매칭 보조 (package.json name 혹은 저장된 projectName)
      if (!matched && result?.name) {
        matched = disconnected.find(
          (p) => p?.name === result.name || p?.projectName === result.name
        );
      }

      const payload = matched
        ? { ...result, isBeforeProject: true, matchedProjectId: matched.id }
        : { ...result, isBeforeProject: false };

      event.reply(replyChannel, payload);
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
    async (event, { replyChannel, id, projectName }) => {
      try {
        await updateProject({ id, projectName });
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

  ipcMain.handle("cmd:restore-project", async (_, { projectId, clonePath }) => {
    return await restoreProject(projectId, clonePath);
  });
}
