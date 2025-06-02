import registerDBHandlers from "./modules/db.js";
// import registerGitHandlers from "./modules/git.js";
import registerProjectHandlers from "./modules/project.js";
import registerSettingsHandlers from "./modules/settings.js";
// import registerWindowHandlers from "./modules/window.js";

export function registerAllIpcHandlers(mainWindow) {
  registerDBHandlers(mainWindow);
  registerSettingsHandlers(mainWindow);
  registerProjectHandlers(mainWindow);
  // registerGitHandlers(mainWindow);
  // registerWindowHandlers(mainWindow);
}
