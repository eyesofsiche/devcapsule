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
  setList({ dispatch, commit }, { list, options = { save: true } }) {
    commit("SET_LIST", list);
    dispatch("projects/setUnreg", list.map((item) => item.list).flat(), {
      root: true,
    });
    if (options.save) {
      window.electron.lowdb.set(
        "watch",
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
