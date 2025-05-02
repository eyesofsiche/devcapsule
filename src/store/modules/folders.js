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
    dispatch("projects/setUnreg", list.map((folder) => folder.list).flat(), {
      root: true,
    });
    if (options.save) {
      window.electron.lowdb.set(
        "folders",
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
