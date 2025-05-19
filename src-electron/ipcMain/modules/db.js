import { ipcMain } from "electron";

import {
  readSection,
  updateSection,
  writeSection,
} from "../../db/lowdb/index.js";

export default function registerDBHandlers() {
  ipcMain.handle("lowdb:get", async (event, key) => {
    try {
      return await readSection(key);
    } catch (err) {
      console.error(`[lowdb:get] Error reading ${key}:`, err);
      return null;
    }
  });

  ipcMain.handle("lowdb:set", async (event, { key, value }) => {
    try {
      await updateSection(key, value);
      return true;
    } catch (err) {
      console.error(`[lowdb:set] Error updating ${key}:`, err);
      return false;
    }
  });

  ipcMain.handle("lowdb:write", async (event, { key, value }) => {
    try {
      await writeSection(key, value);
      return true;
    } catch (err) {
      console.error(`[lowdb:write] Error writing ${key}:`, err);
      return false;
    }
  });
}
