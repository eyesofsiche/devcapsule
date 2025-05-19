import { app } from "electron";
import fs from "fs/promises";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";

const filePath = path.join(
  path.join(app.getPath("appData"), __APP_NAME__),
  "db/lowdb/projects.json"
);
const adapter = new JSONFile(filePath);
const defaultData = {
  version: 1,
  projects: [],
};
// [
//   {
//     "id": "UUID",
//     "name": "api",
//     "path": "/Users/user/Documents/api",
//     "lastSynced": null
//   }
// ]

let db = new Low(adapter, defaultData);
let initialized = false;

export async function initDB() {
  if (initialized) return;

  console.log("initdb :", filePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await db.read();

  const fileExists = await fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);

  if (!fileExists) {
    db.data = defaultData;
    await db.write();
  } else if (db.data.version !== defaultData.version) {
    await migrate();
  }

  initialized = true;
}

async function migrate() {
  const oldVersion = db.data.version || 0;

  if (oldVersion < 1) {
    // future migration logic
  }

  db.data.version = defaultData.version;
  await db.write();
}

export function getDB() {
  return db;
}

export async function read() {
  await db.read();
  if (!db.data.projects) db.data.projects = defaultData.projects;
  return db.data.projects;
}

export async function write(data = []) {
  db.data.projects = data;
  await db.write();
}

export async function update(patch) {
  await db.read();

  const idx = db.data.projects.findIndex((item) => item.id === patch.id);
  if (idx === -1) {
    db.data.projects.push(patch);
  } else {
    db.data.projects[idx] = {
      ...patch,
    };
  }

  await db.write();
}
