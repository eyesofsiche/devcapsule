import { ipcMain } from "electron";

import { readDB, updateDBSection } from "../../db/lowdb.js";

export default function registerDBHandlers() {
  ipcMain.handle("lowdb:get", async () => {
    try {
      return await readDB();
    } catch (err) {
      console.error("❌ Failed to read lowdb:", err);
      return null; // 또는 빈 객체 {}, 오류 신호 반환
    }
  });

  ipcMain.handle("lowdb:set", async (event, data) => {
    try {
      await updateDBSection(data.key, data.value);
      return true;
    } catch (err) {
      console.error("❌ Failed to update lowdb:", err);
      return false;
    }
  });
}
