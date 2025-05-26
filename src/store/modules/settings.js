import * as devalue from "devalue";

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
  async init({ dispatch }) {
    const settings = await window.electron.lowdb.get("settings");
    dispatch("setSettings", {
      data: settings,
      options: { save: false },
    });
    await dispatch("setAllPath");
  },
  setSettings({ commit }, { data, options = { save: true } }) {
    if (options.save) {
      if (state.autoRefresh !== data.autoRefresh) {
        window.electron.autoRefresh(data.autoRefresh);
      }
      window.electron.lowdb.set(
        "settings",
        devalue.parse(devalue.stringify(data))
      );
    }
    commit("SET_AUTO_RUN", data.autoRun);
    commit("SET_AUTO_REFRESH", data.autoRefresh);
    commit("SET_THEME", data.theme);
    commit("SET_LANGUAGE", data.language);
  },

  async setAllPath({ dispatch }) {
    await dispatch("watchs/init", {}, { root: true });
    await dispatch("projects/init", {}, { root: true });
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
