import registerDBHandlers from "./modules/db.js";
import registerProjectHandlers from "./modules/project.js";
import registerSettingsHandlers from "./modules/settings.js";

export function registerAllIpcHandlers() {
  registerDBHandlers();
  registerSettingsHandlers();
  registerProjectHandlers();
}
