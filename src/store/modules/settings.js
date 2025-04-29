const state = {
  theme: "dark",
  language: "ko",
};

const mutations = {
  SET_THEME: (state, theme) => {
    state.theme = theme;
  },
  SET_LANGUAGE: (state, language) => {
    state.language = language;
  },
};

const actions = {
  setSettings({ commit }, { data, options = { save: true } }) {
    commit("SET_THEME", data.theme);
    commit("SET_LANGUAGE", data.language);
    if (options.save) {
      window.electron.lowdb.set("settings", data);
    }
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
