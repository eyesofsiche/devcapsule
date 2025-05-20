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
      window.electron.lowdb.write(
        "watchs",
        devalue.parse(devalue.stringify(list))
      );
    }
  },
  async addProject({ state, dispatch }, { path }) {
    const result = state.list.map((watch) => {
      watch.list = watch.list.filter((paths) => paths !== path);
      watch.count = watch.list.length;
      return watch;
    });
    dispatch("setList", {
      list: result,
      options: { save: true },
    });
    await dispatch("projects/init", {}, { root: true });
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
