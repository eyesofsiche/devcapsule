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

  // 📌 푸시 이벤트 연결
  if (window?.electron?.onPush) {
    window.electron.onPush("push:update", (data) => {
      console.log("🟢 메인에서 push:update 수신", data);
      if (data.type === "path") {
        Store.dispatch("settings/setAllPath");
      }
    });
  }

  setStore(Store);
  return Store;
});
