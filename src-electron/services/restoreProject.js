import fs from "fs/promises";
import path from "path";
import simpleGit from "simple-git";

import { readSection } from "../db/lowdb/index.js";
import { getUserDataPath } from "../utils/getPath.js";
import { updateProjectFileExists } from "./updateProject.js";

export async function restoreProject(projectId) {
  try {
    const projects = await readSection("projects");
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      return { success: false, error: "프로젝트 정보를 찾을 수 없습니다." };
    }

    const { path: folderPath, git, envs = [] } = project;

    if (!git) {
      return { success: false, error: "연결된 Git 저장소 정보가 없습니다." };
    }

    // git clone
    const parentDir = path.dirname(folderPath);
    await fs.mkdir(parentDir, { recursive: true });
    const gitClient = simpleGit({ baseDir: parentDir });
    await gitClient.clone(git, folderPath).catch((err) => {
      console.error("❌ Git clone 실패:", err.message);
      throw err;
    });

    // .env 복사
    const restored = [],
      failed = [];
    const backupDir = path.join(getUserDataPath(), `envs/${projectId}`);
    for (const envFile of envs) {
      const backupPath = path.join(backupDir, envFile);
      const targetPath = path.join(folderPath, envFile);

      try {
        const data = await fs.readFile(backupPath);
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, data);
        restored.push(envFile);
      } catch (err) {
        console.warn(`⚠️ env 복원 실패: ${envFile}`, err.message);
        failed.push(envFile);
      }
    }

    // watch 제외 폴더 설정
    await updateProjectFileExists(projectId, true);

    return { success: true, restored, failed };
  } catch (err) {
    console.error("❌ 프로젝트 복구 오류:", err);
    return { success: false, error: err.message };
  }
}
