const state = {
  autoRun: false,
  autoRefresh: false,
  theme: "dark",
  language: "ko",
};

const mutations = {
  SET_AUTO_RUN: (state, autoRun) => {
    state.autoRun = autoRun;
  },
  SET_AUTO_REFRESH: (state, autoRefresh) => {
    state.autoRefresh = autoRefresh;
  },
  SET_THEME: (state, theme) => {
    state.theme = theme;
  },
  SET_LANGUAGE: (state, language) => {
    state.language = language;
  },
};

const actions = {
  setSettings({ commit }, { data, options = { save: true } }) {
    commit("SET_AUTO_RUN", data.autoRun);
    commit("SET_AUTO_REFRESH", data.autoRefresh);
    commit("SET_THEME", data.theme);
    commit("SET_LANGUAGE", data.language);
    if (options.save) {
      window.electron.lowdb.set("settings", {
        autoRun: data.autoRun,
        autoRefresh: data.autoRefresh,
        theme: data.theme,
        language: data.language,
      });
    }
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
