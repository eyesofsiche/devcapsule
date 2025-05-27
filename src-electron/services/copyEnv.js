// src-electron/services/registerProject.js
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

import { getUserDataPath } from "../utils/userData.js";

/**
 * 6번 로직: env 파일 복사 + index.md 업데이트
 * 실패 시 undoTasks 역순으로 실행해 모두 롤백합니다.
 *
 * @param {String} folderPath    원본 프로젝트 경로
 * @param {String} projectId     devcapsule.id
 * @param {String[]} envFiles    복사할 env 파일명 리스트 (기본 ['.env'])
 */
export async function copyEnv(folderPath, projectId, envFiles = [".env"]) {
  const envsBase = path.join(getUserDataPath(), "envs");
  const projectEnvDir = path.join(envsBase, projectId);

  const undoTasks = [];

  try {
    // 6.1) envsBase 폴더 보장
    await fs.mkdir(envsBase, { recursive: true });

    // 6.2) 프로젝트별 디렉토리 생성
    await fs.mkdir(projectEnvDir, { recursive: true });
    undoTasks.push(async () => {
      await fs.rm(projectEnvDir, { recursive: true, force: true });
    });

    // 6.3) 각 env 파일 복사
    for (const fileName of envFiles) {
      const src = path.join(folderPath, fileName);
      if (existsSync(src)) {
        // throw new Error(`복사 대상 파일이 없습니다: ${fileName}`);
        const dest = path.join(projectEnvDir, fileName);
        await fs.copyFile(src, dest);
        undoTasks.push(async () => {
          await fs.rm(dest, { force: true });
        });
      }
    }
  } catch (err) {
    // rollback in reverse order
    for (let i = undoTasks.length - 1; i >= 0; i--) {
      try {
        await undoTasks[i]();
      } catch (e) {
        console.error("🍂 rollback error:", e);
      }
    }
    throw err;
  }
}
