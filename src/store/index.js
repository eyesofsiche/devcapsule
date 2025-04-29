import { createStore } from "vuex";

import _ from "lodash";
import { store } from "quasar/wrappers";

import getters from "./getters";
import { setStore } from "./instance";

const modulesFiles = import.meta.glob("./modules/*.js", { eager: true });
async function loadModules() {
  const modules = {};
  const modulePaths = Object.keys(modulesFiles);
  for (const modulePath of modulePaths) {
    const mod = await modulesFiles[modulePath]();
    const moduleName = modulePath.replace(
      /^\.\/modules\/(.*)\.js(?:\?.+)?$/,
      "$1"
    );
    modules[moduleName] = mod.default;
  }
  return modules;
}

export default store(async function (/* { ssrContext } */) {
  const modules = await loadModules();
  const Store = createStore({
    modules,
    getters,
    // strict: process.env.DEBUGGING,
  });
  setStore(Store);
  return Store;
});
