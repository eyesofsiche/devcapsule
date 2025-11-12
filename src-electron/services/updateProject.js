import { readSection, updateSection, writeSection } from "../db/lowdb/index.js";
import { updateIndexMD } from "./updateIndexMD.js";

export async function updateProject({
  id,
  name,
  projectName,
  path,
  version,
  description,
  license,
  size,
  git,
  envs,
  envPatterns,
}) {
  if (!id) {
    throw new Error("Project id is required.");
  }
  const projectsDB = await readSection("projects");
  const existingProject = projectsDB.find((p) => p.id === id);
  if (!existingProject) {
    if (!path) {
      throw new Error("path is required for new projects.");
    }
    await excludeFolderList(path);
  }

  await updateSection("projects", {
    id,
    name: name ?? existingProject?.name ?? "no title",
    projectName:
      projectName ?? existingProject?.projectName ?? existingProject?.name,
    path: path ?? existingProject?.path ?? "",
    lastSynced: new Date().toISOString(),
    isFileExists: existingProject?.isFileExists ?? true,
    version: version ?? existingProject?.version ?? "",
    description: description ?? existingProject?.description ?? "",
    license: license ?? existingProject?.license ?? "",
    size: size ?? existingProject?.size ?? "",
    git: git ?? existingProject?.git ?? "",
    envs: envs ?? existingProject?.envs ?? [],
    envPatterns: envPatterns ?? existingProject?.envPatterns ?? [],
  });

  await updateIndexMD();
}

export async function excludeFolderList(folderPath) {
  const watchsDB = await readSection("watchs");
  watchsDB.forEach((watchs) => {
    if (watchs.list.includes(folderPath)) {
      watchs.list = watchs.list.filter((item) => item !== folderPath);
      watchs.count -= 1;
    }
  });

  await writeSection("watchs", watchsDB);
}

export async function updateProjectFileExists(projectId, exists = false) {
  const projectsDB = await readSection("projects");
  const project = projectsDB.find((p) => p.id === projectId);
  if (project) {
    project.isFileExists = exists;
  }
  await updateSection("projects", {
    ...project,
  });
  return null;
}
