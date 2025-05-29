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

import { invokeWithReply } from "./utils/ipc.js";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  invokeWithReply,
  lowdb: {
    get: (key) => ipcRenderer.invoke("lowdb:get", key),
    set: (key, value) => ipcRenderer.invoke("lowdb:set", { key, value }),
    write: (key, value) => ipcRenderer.invoke("lowdb:write", { key, value }),
  },
  autoRefresh: (flag, type) => {
    ipcRenderer.send("cmd:change-auto-refresh", flag);
  },
  manualRefresh: () => ipcRenderer.invoke("cmd:manual-refresh"),

  selectFolder: async () => {
    try {
      return await ipcRenderer.invoke("dialog:openDirectory");
    } catch (error) {
      console.error("폴더 선택 에러:", error);
      throw error;
    }
  },
  openFolder: (folderPath) => ipcRenderer.invoke("cmd:open-folder", folderPath),
  openVSCode: (folderPath) => ipcRenderer.invoke("cmd:open-vscode", folderPath),
  openTerminal: (folderPath) =>
    ipcRenderer.invoke("cmd:open-terminal", folderPath),
  removeFolder: (folderPath) =>
    ipcRenderer.invoke("cmd:remove-folder", folderPath),
  restoreProject: (projectId) =>
    ipcRenderer.invoke("cmd:restore-project", projectId),

  onPush: (channel, listener) => {
    // 보안을 위해 허용할 채널을 제한할 수도 있어요
    const validChannels = ["push:update"];
    if (!validChannels.includes(channel)) return;
    ipcRenderer.on(channel, (_event, payload) => {
      listener(payload);
    });
  },

  // 창 컨트롤 기능 추가
  windowControl: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  },
});
