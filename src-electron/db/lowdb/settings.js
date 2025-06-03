import AutoLaunch from "auto-launch";
import fs from "fs/promises";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";

import { getRealUserPath } from "../../helpers/getRealUserPath.js";
import { getUserDataPath } from "../../utils/userData.js";

const filePath = path.join(getUserDataPath(), "db/lowdb/settings.json");
const adapter = new JSONFile(filePath);
const defaultData = {
  version: 1,
  path: null,
  settings: {
    autoRun: false,
    autoRefresh: false,
    theme: "dark",
    language: "ko",
  },
};

let db = new Low(adapter, defaultData);
let initialized = false;

const appLauncher = new AutoLaunch({
  name: "DevCapsule",
  path: process.execPath,
});

export async function initDB() {
  if (initialized) return;
  const isEnabled = await appLauncher.isEnabled();
  defaultData.settings.autoRun = isEnabled;

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

  if (!db.data.path) {
    db.data.path = await getRealUserPath();
    await db.write();
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

export async function read(type = "settings") {
  await db.read();
  const isEnabled = await appLauncher.isEnabled();
  db.data.settings.autoRun = isEnabled;
  defaultData.settings.autoRun = isEnabled;
  if (!db.data.settings) db.data.settings = defaultData.settings;
  if (type === "settings") {
    return db.data.settings;
  } else if (type === "all") {
    return db.data;
  }
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

export async function remove(id) {
  return false;
}
