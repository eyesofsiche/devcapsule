import { readDB, writeDB } from "../db/lowdb.js";

export async function updateProject(folderPath) {}

export async function excludeFolderList(folderPath) {
  const db = await readDB();
  db.folders.forEach((folder) => {
    if (folder.list.includes(folderPath)) {
      folder.list = folder.list.filter((item) => item !== folderPath);
      folder.count -= 1;
    }
  });

  await writeDB(db);
}
