import _ from "lodash";

const state = {
  settings: null,
};

const mutations = {
  SET_SETTINGS: (state, settings) => {
    state.settings = settings;
  },
};

const actions = {
  async loadSettings({ commit }) {
    // const settings = await window.electron.invoke("get-db", "settings");
    commit("SET_SETTINGS", null);
  },
  async setSettings({ commit }, settings) {
    const value = _.assign(state.settings, settings);
    console.log("settings", value);
    // await window.electron.invoke("set-db", "settings", value);
    commit("SET_SETTINGS", value);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
