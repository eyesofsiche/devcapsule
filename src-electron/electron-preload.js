/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 *
 * Example (injects window.myAPI.doAThing() into renderer thread):
 *
 *   import { contextBridge } from 'electron'
 *
 *   contextBridge.exposeInMainWorld('myAPI', {
 *     doAThing: () => {}
 *   })
 *
 * WARNING!
 * If accessing Node functionality (like importing @electron/remote) then in your
 * electron-main.js you will need to set the following when you instantiate BrowserWindow:
 *
 * mainWindow = new BrowserWindow({
 *   // ...
 *   webPreferences: {
 *     // ...
 *     sandbox: false // <-- to be able to import @electron/remote in preload script
 *   }
 * }
 */

import { contextBridge, ipcRenderer } from "electron";

import { invokeWithReply } from "./middleware/ipcClient.js";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  invokeWithReply,
  lowdb: {
    get: () => ipcRenderer.invoke("lowdb:get"),
    set: (key, value) => ipcRenderer.invoke("lowdb:set", { key, value }),
  },
  autoRefresh: (flag, type) => {
    ipcRenderer.send("cmd:change-auto-refresh", flag);
  },

  selectFolder: async () => {
    try {
      return await ipcRenderer.invoke("dialog:openDirectory");
    } catch (error) {
      console.error("폴더 선택 에러:", error);
      throw error;
    }
  },

  // 창 컨트롤 기능 추가
  windowControl: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  },
});
