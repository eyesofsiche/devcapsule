import { app } from "electron";
import path from "path";

export function getUserDataPath() {
  if (process.env.TEST) {
    return path.join(process.cwd(), "test/userData");
  }
  return path.join(app.getPath("appData"), __APP_NAME__);
}
