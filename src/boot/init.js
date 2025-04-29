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

  const db = await window.electron.lowdb.get();
  store.dispatch("settings/setSettings", {
    data: db.settings,
    options: { save: false },
  });
  store.dispatch("folders/setList", {
    list: db.folders,
    options: { save: false },
  });
  store.dispatch("projects/setList", {
    list: db.projects,
    options: { save: false },
  });
});
