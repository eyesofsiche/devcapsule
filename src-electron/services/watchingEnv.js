import chokidar from "chokidar";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

import { readSection } from "../db/lowdb/index.js";
import { getUserDataPath } from "../utils/userData.js";

const watchers = new Map();

export async function initAllWatchers() {
  const projects = await readSection("projects");
  console.log(projects);
  if (!projects || projects.length === 0) return;
  for (const project of projects) {
    addProjectWatcher(project);
  }
}

export function addProjectWatcher(project) {
  if (!project.isFileExists || !project.envs || project.envs.length === 0)
    return;

  for (const envName of project.envs) {
    console.log("envName: ", envName);
    const fullPath = path.join(project.path, envName);

    if (!existsSync(fullPath)) continue;
    if (watchers.has(fullPath)) continue; // 이미 감시 중

    const watcher = chokidar.watch(fullPath, {
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    watcher.on("change", async () => {
      try {
        const backupPath = path.join(
          getUserDataPath(), // 너가 정의한 함수
          "envs",
          project.id,
          envName
        );
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.copyFile(fullPath, backupPath);
        console.log(`[WATCH] ${envName} 변경됨 → 백업 완료`);
      } catch (err) {
        console.error(`[WATCH] ${envName} 복사 실패`, err);
      }
    });

    watchers.set(fullPath, watcher);
  }
}

export function stopAllWatching() {
  for (const [_, watcher] of watchers) {
    watcher.close();
  }
  watchers.clear();
}

export function removeProjectWatcher(projectPath, envs) {
  if (!envs || envs.length === 0) return;

  for (const envName of envs) {
    const fullPath = path.join(projectPath, envName);
    if (watchers.has(fullPath)) {
      const watcher = watchers.get(fullPath);
      if (watcher) {
        watcher.close();
        watchers.delete(fullPath);
        console.log(`[UNWATCH] ${fullPath}`);
      }
    }
  }
}

export function restartProjectWatcher(prevProjectPath, prevEnvs, project) {
  removeProjectWatcher(prevProjectPath, prevEnvs);
  addProjectWatcher(project);
}

export function restartAllWatcher() {
  stopAllWatching();
  initAllWatchers();
}
