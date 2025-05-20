import { rm } from "fs/promises";
import path from "path";

import { readSection, removeSection } from "../db/lowdb";

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
    const devcapsulePath = path.join(project.path, ".devcapsule");
    try {
      await rm(devcapsulePath, { force: true });
    } catch (error) {
      return {
        success: false,
        error: ".devcapsule 삭제 실패",
      };
    }
  }
  return {
    success: del,
  };
}
