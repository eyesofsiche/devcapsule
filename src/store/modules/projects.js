import * as devalue from "devalue";

const state = {
  list: [],
  unreg: [],
};

const mutations = {
  SET_LIST: (state, list) => {
    state.list = list;
  },
  SET_UNREG: (state, list) => {
    state.unreg = list;
  },
};

const actions = {
  async init({ dispatch }) {
    const projects = await window.electron.lowdb.get("projects");
    dispatch("setList", {
      list: projects,
      options: { save: false },
    });
  },
  setList({ commit }, { list, options = { save: true } }) {
    commit("SET_LIST", list);
    if (options.save) {
      window.electron.lowdb.set(
        "projects",
        devalue.parse(devalue.stringify(list))
      );
    }
  },
  setUnreg({ commit }, list) {
    commit("SET_UNREG", list);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
