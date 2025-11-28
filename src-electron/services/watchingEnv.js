import chokidar from "chokidar";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

import { readSection } from "../db/lowdb/index.js";
import { getEnvPatterns, findEnvFiles } from "../helpers/analyzeProject.js";
import { getUserDataPath } from "../utils/getPath.js";
import { updateProject } from "./updateProject.js";

const watchers = new Map();
const ignoreWatchers = new Map();

export async function initAllWatchers() {
  const projects = await readSection("projects");
  // console.log(projects);
  if (!projects || projects.length === 0) return;
  for (const project of projects) {
    addProjectWatcher(project);
  }
}

export function addProjectWatcher(project) {
  addProjectIgnore(project);
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
        const backupDir = path.join(
          getUserDataPath(),
          `envs/files/${project.id}`
        );
        const backupPath = path.join(backupDir, envName);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.copyFile(fullPath, backupPath);
        console.log(`[WATCH] ${envName} 변경됨 → 백업 완료`);
      } catch (err) {
        console.error(`[WATCH] ${envName} 복사 실패`, err);
      }
    });

    // 파일/폴더 삭제 감지
    watcher.on("unlink", () => {
      console.log(`⚠️ [WATCH] ${envName} 삭제 감지 - watcher 정리`);
      watcher.close();
      watchers.delete(fullPath);

      // DB 업데이트: isFileExists = false
      updateProject({
        id: project.id,
        isFileExists: false,
      }).catch((err) => {
        console.error(`[WATCH] DB 업데이트 실패:`, err);
      });
    });

    // 에러 처리 (경로 접근 불가 등)
    watcher.on("error", (error) => {
      console.error(`❌ [WATCH] ${fullPath} 에러 발생:`, error.message);
      watcher.close();
      watchers.delete(fullPath);
    });

    watchers.set(fullPath, watcher);
  }
}

function addProjectIgnore(project) {
  if (!project.isFileExists) return;
  const gitignorePath = path.join(project.path, ".gitignore");
  if (ignoreWatchers.has(gitignorePath)) return; // 중복 방지
  if (existsSync(gitignorePath)) {
    const watcher = chokidar.watch(gitignorePath, {
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });
    watcher.on("change", async () => {
      const envPatterns = await getEnvPatterns(project.path);
      const envFiles = await findEnvFiles(project.path, envPatterns);

      await updateProject({
        id: project.id,
        envPatterns: envPatterns,
        envs: envFiles,
      });

      restartProjectWatcher(project.path, project.envs, {
        ...project,
        envPatterns: envPatterns,
        envs: envFiles,
      });
    });

    ignoreWatchers.set(gitignorePath, watcher);
  }
}

export function stopAllWatching() {
  for (const [_, watcher] of watchers) {
    watcher.close();
  }
  watchers.clear();
}

export function removeProjectWatcher(projectPath, envs) {
  removeIgnoreWatcher(projectPath);
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

export function removeIgnoreWatcher(projectPath) {
  const gitignorePath = path.join(projectPath, ".gitignore");
  if (ignoreWatchers.has(gitignorePath)) {
    ignoreWatchers.get(gitignorePath).close();
    ignoreWatchers.delete(gitignorePath);
    console.log(`[UNWATCH] .gitignore: ${gitignorePath}`);
  }
}

export function restartProjectWatcher(prevProjectPath, prevEnvs, project) {
  removeProjectWatcher(prevProjectPath, prevEnvs);
  removeIgnoreWatcher(prevProjectPath);
  addProjectWatcher(project);
}

export function restartAllWatcher() {
  stopAllWatching();
  initAllWatchers();
}
