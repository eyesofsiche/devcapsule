import _ from "lodash";
import { boot } from "quasar/wrappers";
export default boot(async ({ app, store, router }) => {
  // router.beforeEach(async (to, from, next) => {
  //   if (to.name !== "setting" && store.state.common.settings === null) {
  //     next({ name: "setting" });
  //   } else {
  //     next();
  //   }
  // });
  app.config.globalProperties.$_ = _;

  const settings = await window.electron.lowdb.get("settings");
  const watchs = await window.electron.lowdb.get("watchs");
  store.dispatch("settings/setSettings", {
    data: settings,
    options: { save: false },
  });
  store.dispatch("watchs/setList", {
    list: watchs,
    options: { save: false },
  });
  store.dispatch("projects/init");
});
