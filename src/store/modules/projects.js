import * as devalue from "devalue";

const state = {
  list: [],
};

const mutations = {
  SET_LIST: (state, list) => {
    state.list = list;
  },
};

const actions = {
  setList({ commit }, { list, options = { save: true } }) {
    commit("SET_LIST", list);
    if (options.save) {
      window.electron.lowdb.set(
        "projects",
        devalue.parse(devalue.stringify(list))
      );
    }
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
