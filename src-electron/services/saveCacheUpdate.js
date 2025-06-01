import _ from "lodash";

import { readSection } from "../db/lowdb/index.js";
import { copyEnv } from "./copyEnv.js";
import { writeDevcapsuleFile } from "./registerProject.js";
import { updateProject } from "./updateProject.js";

export async function saveCacheUpdate(projectPath, cache, updated) {
  const projectsDB = await readSection("projects");
  const existingProject = projectsDB.find((p) => p.id === cache.id);

  const oldEnv = [...(existingProject.envs || [])].sort();
  const newEnv = [...(updated.envs || [])].sort();
  if (!_.isEqual(oldEnv, newEnv)) {
    await copyEnv(projectPath, cache.id, updated.envs);
  }

  const oldCache = cache.cache;
  const changedCache = !_.isEqual(oldCache, {
    name: updated.name,
    version: updated.version,
    description: updated.description,
    license: updated.license,
    git: updated.git,
    size: updated.size,
    envs: updated.envs,
    envPatterns: updated.envPatterns,
  });
  if (changedCache) {
    await writeDevcapsuleFile(projectPath, {
      id: cache.id,
      cache: updated,
    });
  }

  const shouldUpdateProject = !_.isEqual(
    {
      name: existingProject.name,
      path: existingProject.path,
      git: existingProject.git,
      envs: existingProject.envs,
      envPatterns: existingProject.envPatterns,
    },
    {
      name: updated.name,
      path: projectPath,
      git: updated.git,
      envs: updated.envs,
      envPatterns: updated.envPatterns,
    }
  );

  if (shouldUpdateProject) {
    await updateProject({
      id: cache.id,
      name: updated.name,
      folderPath: projectPath,
      git: updated.git,
      envs: updated.envs,
      envPatterns: updated.envPatterns,
    });
  }
}
