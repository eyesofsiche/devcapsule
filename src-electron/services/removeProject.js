import { removeSection } from "../db/lowdb";

/**
 * 프로젝트 제거
 * @param {String} id   프로젝트 ID
 * @returns
 */
export async function removeProject(id) {
  const del = await removeSection("projects", id);
  return {
    success: del,
  };
}
