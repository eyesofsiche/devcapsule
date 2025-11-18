import * as devalue from "devalue";

const state = {
  autoRun: false,
  autoRefresh: false,
  gitPath: null,
};

const mutations = {
  SET_AUTO_RUN: (state, autoRun) => {
    state.autoRun = autoRun;
  },
  SET_AUTO_REFRESH: (state, autoRefresh) => {
    state.autoRefresh = autoRefresh;
  },
  SET_GIT_PATH: (state, gitPath) => {
    state.gitPath = gitPath;
  },
};

const actions = {
  async init({ dispatch }) {
    await dispatch("readSettings");
    await dispatch("setAllPath");
  },
  setSettings({ commit }, { data, options = { save: true } }) {
    if (options.save) {
      if (state.autoRun !== data.autoRun) {
        window.electron.setAutoLaunch(data.autoRun);
      }
      if (state.autoRefresh !== data.autoRefresh) {
        window.electron.setAutoRefresh(data.autoRefresh);
      }
      window.electron.lowdb.set(
        "settings",
        devalue.parse(devalue.stringify(data))
      );
    }
    commit("SET_AUTO_RUN", data.autoRun);
    commit("SET_AUTO_REFRESH", data.autoRefresh);
    commit("SET_GIT_PATH", data.gitPath);
  },

  async setAllPath({ dispatch }) {
    await dispatch("watchs/init", {}, { root: true });
    await dispatch("projects/init", {}, { root: true });
  },

  async readSettings({ dispatch }) {
    const settings = await window.electron.lowdb.get("settings");
    dispatch("setSettings", {
      data: settings,
      options: { save: false },
    });
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
