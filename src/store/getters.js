const getters = {
  settings: (state) => state.settings,
  watchs: (state) => state.watchs.list,
  refresh: (state) => state.watchs.refresh,
  projects: (state) => state.projects,
};
export default getters;
