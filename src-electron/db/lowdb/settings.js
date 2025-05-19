import { app } from "electron";
import fs from "fs/promises";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";

const filePath = path.join(
  path.join(app.getPath("appData"), __APP_NAME__),
  "db/lowdb/settings.json"
);
const adapter = new JSONFile(filePath);
const defaultData = {
  version: 1,
  settings: {
    autoRun: false,
    autoRefresh: false,
    theme: "dark",
    language: "ko",
  },
};

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
  if (!db.data.settings) db.data.settings = defaultData.settings;
  return db.data.settings;
}

export async function write(data) {
  db.data.settings = data;
  await db.write();
}

export async function update(patch) {
  await db.read();
  db.data.settings = {
    ...db.data.settings,
    ...patch,
  };
  await db.write();
}
