import { rm } from "fs/promises";
import path from "path";

import { readSection, removeSection } from "../db/lowdb";
import { getUserDataPath } from "../utils/userData.js";
import { updateIndexMD } from "./updateIndexMD.js";
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
    await updateIndexMD();
  }
  return {
    success: del,
  };
}

async function deleteProjectEnv(id) {
  const envsBase = path.join(getUserDataPath(), "envs");
  const projectEnvDir = path.join(envsBase, id);
  try {
    await rm(projectEnvDir, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error("🍂 프로젝트 env 삭제 실패:", error);
    return false;
  }
}
