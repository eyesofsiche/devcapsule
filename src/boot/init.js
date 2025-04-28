import { boot } from "quasar/wrappers";

export default boot(async ({ app, store, router }) => {
  // router.beforeEach(async (to, from, next) => {
  //   if (to.name !== "setting" && store.state.common.settings === null) {
  //     next({ name: "setting" });
  //   } else {
  //     next();
  //   }
  // });
});
