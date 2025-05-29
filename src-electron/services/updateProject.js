import { readSection, updateSection, writeSection } from "../db/lowdb/index.js";

export async function updateProject({ id, name, folderPath, git, envs }) {
  if (!id) {
    throw new Error("Project id is required.");
  }
  const projectsDB = await readSection("projects");
  const existingProject = projectsDB.find((p) => p.id === id);
  if (!existingProject) {
    if (!folderPath) {
      throw new Error("folderPath is required for new projects.");
    }
    await excludeFolderList(folderPath);
  }

  await updateSection("projects", {
    id,
    name: name ?? existingProject?.name ?? "no title",
    path: folderPath ?? existingProject?.path ?? "",
    lastSynced: new Date().toISOString(),
    isFileExists: existingProject?.isFileExists ?? true,
    git: git ?? existingProject?.git ?? "",
    envs: envs ?? existingProject?.envs ?? [],
  });
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
