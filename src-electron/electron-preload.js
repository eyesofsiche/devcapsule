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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  lowdb: {
    get: () => ipcRenderer.invoke("lowdb:get"),
    set: (key, value) => ipcRenderer.invoke("lowdb:set", { key, value }),
  },
  // invoke: (channel, data) => {
  //   // whitelist channels
  //   const validChannels = ["lowdb:get", "lowdb:set"];
  //   if (validChannels.includes(channel)) {
  //     return ipcRenderer.invoke(channel, data);
  //   }
  // },

  selectFolder: async () => {
    try {
      return await ipcRenderer.invoke("dialog:openDirectory");
    } catch (error) {
      console.error("폴더 선택 에러:", error);
      throw error;
    }
  },

  getProjectCount: async (path) => {
    console.log("path", path);
    try {
      // 이벤트 리스너 등록
      const result = await new Promise((resolve) => {
        const listener = (event, data) => {
          if (data.path === path) {
            ipcRenderer.removeListener("project-count-result", listener);
            resolve(data);
          }
        };
        ipcRenderer.on("project-count-result", listener);
        ipcRenderer.send("get-project-count", path);
      });
      return result;
    } catch (error) {
      console.error("프로젝트 카운트 에러:", error);
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
