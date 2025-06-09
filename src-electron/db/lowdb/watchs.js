import fs from "fs/promises";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";

import { getUserDataPath } from "../../utils/getPath.js";

const filePath = path.join(getUserDataPath(), "db/lowdb/watchs.json");
const adapter = new JSONFile(filePath);
const defaultData = {
  version: 1,
  watchs: [],
};
// [
//   {
//     "path": "/Users/user/Documents",
//     "count": 64,
//     "list": [
//       "/Users/user/Documents/1",
//       "/Users/user/Documents/2",
//       ...
//     ]
//   }
// ]

let db = new Low(adapter, defaultData);
let initialized = false;

export async function initDB() {
  if (initialized) return;

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
  if (!db.data.watchs) db.data.watchs = defaultData.watchs;
  return db.data.watchs;
}

export async function write(data = []) {
  db.data.watchs = data;
  await db.write();
}

export async function update(patch) {
  await db.read();

  const idx = db.data.watchs.findIndex((item) => item.path === patch.path);
  if (idx === -1) {
    db.data.watchs.push(patch);
  } else {
    db.data.watchs[idx] = {
      ...patch,
    };
  }

  await db.write();
}

export async function remove(path) {
  await db.read();

  const idx = db.data.watchs.findIndex((item) => item.path === path);
  if (idx !== -1) {
    db.data.watchs.splice(idx, 1);
    await db.write();
    return true;
  }
  return false;
}
