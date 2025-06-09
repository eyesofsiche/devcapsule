import { app } from "electron";
import path from "path";

export function getUserDataPath() {
  if (process.env.TEST) {
    return path.join(process.cwd(), "test/userData");
  }
  return path.join(app.getPath("appData"), __APP_NAME__);
}

export function getResourcesPath(name) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, name);
  } else {
    return path.resolve(__dirname, `../../src-electron/${name}`);
  }
}

export function getResourcesPublicPath(name) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, name);
  } else {
    return path.join(process.cwd(), `public/${name}`);
  }
}
