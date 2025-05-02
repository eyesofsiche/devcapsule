import { ipcMain } from "electron";

import { readDB, updateDBSection } from "../../db/lowdb.js";

export default function registerDBHandlers() {
  ipcMain.handle("lowdb:get", async () => {
    try {
      return await readDB();
    } catch (err) {
      return null;
    }
  });

  ipcMain.handle("lowdb:set", async (event, data) => {
    try {
      await updateDBSection(data.key, data.value);
      return true;
    } catch (err) {
      return false;
    }
  });
}
