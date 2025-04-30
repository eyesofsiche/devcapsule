import registerDBHandlers from "./modules/db.js";
import registerSettingsHandlers from "./modules/settings.js";

export function registerAllIpcHandlers() {
  registerDBHandlers();
  registerSettingsHandlers();
}
