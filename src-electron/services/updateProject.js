import { readSection, updateSection, writeSection } from "../db/lowdb/index.js";

export async function updateProject({ id, name, folderPath }) {
  const projectsDB = await readSection("projects");
  const alreadyExists = projectsDB.some((p) => p.id === id);
  if (!alreadyExists) {
    await excludeFolderList(folderPath);
  }
  await updateSection("projects", {
    id,
    name,
    path: folderPath,
    lastSynced: null,
    isFileExists: true,
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
  return null;
}
