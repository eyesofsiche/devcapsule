import fs from "fs/promises";
import path from "path";
import simpleGit from "simple-git";

import { readSection } from "../db/lowdb/index.js";
import { getUserDataPath } from "../utils/getPath.js";
import { updateProjectFileExists } from "./updateProject.js";

export async function restoreProject(projectId, clonePath) {
  try {
    const projects = await readSection("projects");
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      return { success: false, error: "프로젝트 정보를 찾을 수 없습니다." };
    }

    const { path: originalPath, git, envs = [] } = project;

    const gitOriginUrl = git.remotes[0]?.url || null;
    if (!git || !gitOriginUrl) {
      return { success: false, error: "연결된 Git 저장소 정보가 없습니다." };
    }

    // git clone (프론트에서 계산된 최종 경로로 클론)
    const parentDir = path.dirname(clonePath);
    const folderName = path.basename(clonePath);

    await fs.mkdir(parentDir, { recursive: true });
    const gitClient = simpleGit({ baseDir: parentDir });

    console.log(`🔄 Git clone: ${gitOriginUrl} → ${clonePath}`);
    await gitClient.clone(gitOriginUrl, folderName).catch((err) => {
      console.error("❌ Git clone 실패:", err.message);
      throw err;
    });

    // .env 복사
    const restored = [],
      failed = [];
    const backupDir = path.join(getUserDataPath(), `envs/files/${projectId}`);
    for (const envFile of envs) {
      const backupPath = path.join(backupDir, envFile);
      const targetEnvPath = path.join(clonePath, envFile);

      try {
        const data = await fs.readFile(backupPath);
        await fs.mkdir(path.dirname(targetEnvPath), { recursive: true });
        await fs.writeFile(targetEnvPath, data);
        restored.push(envFile);
      } catch (err) {
        console.warn(`⚠️ env 복원 실패: ${envFile}`, err.message);
        failed.push(envFile);
      }
    }

    // watch 제외 폴더 설정 & DB 업데이트
    await updateProjectFileExists(projectId, true, clonePath);

    return {
      success: true,
      restored,
      failed,
      clonePath,
    };
  } catch (err) {
    console.error("❌ 프로젝트 복구 오류:", err);
    return { success: false, error: err.message };
  }
}
