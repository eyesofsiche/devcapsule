import { rm } from "fs/promises";
import path from "path";

import { readSection, removeSection } from "../db/lowdb";
import { getUserDataPath } from "../utils/getPath.js";
import { commitAndPushEnvs } from "./gitRepo.js";
import { updateReadmeMD } from "./updateReadmeMD.js";
import { removeProjectWatcher } from "./watchingEnv.js";

/**
 * 프로젝트 제거
 * @param {String} id   프로젝트 ID
 * @returns
 */
export async function removeProject(id) {
  const projectsDB = await readSection("projects");
  const project = projectsDB.find((project) => project.id === id);
  const del = await removeSection("projects", id);
  if (project.path) {
    // watcher 제거
    removeProjectWatcher(project.path, project.envs);
    const devcapsulePath = path.join(project.path, ".devcapsule");
    try {
      await rm(devcapsulePath, { force: true });
    } catch (error) {
      return {
        success: false,
        error: ".devcapsule 삭제 실패",
      };
    }
    try {
      await deleteProjectEnv(id);
    } catch (error) {
      return {
        success: false,
        error: "env 삭제 실패",
      };
    }
    // 후처리: README 업데이트, Git 백업 (비동기 처리)
    postRemoveSideEffects(project.projectName).catch((err) => {
      console.error("postRemoveSideEffects 실패:", err);
    });
  }
  return {
    success: del,
  };
}

async function deleteProjectEnv(id) {
  const envsBase = path.join(getUserDataPath(), "envs");
  const projectEnvDir = path.join(envsBase, "files", id);
  try {
    await rm(projectEnvDir, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error("🍂 프로젝트 env 삭제 실패:", error);
    return false;
  }
}

async function postRemoveSideEffects(projectName) {
  try {
    // README.md 파일 업데이트
    await updateReadmeMD();
  } catch (err) {
    console.error("README 업데이트 실패:", err);
  }

  try {
    // Git 백업 (push는 네트워크 상태/락 매니저를 내부에서 처리)
    await commitAndPushEnvs("Removed project: " + projectName);
  } catch (err) {
    console.error("Git 백업 실패:", err);
  }
}
