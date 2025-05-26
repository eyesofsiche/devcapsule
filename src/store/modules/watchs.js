import * as devalue from "devalue";

const state = {
  list: [],
  refresh: false,
};

const mutations = {
  SET_LIST: (state, list) => {
    state.list = list;
  },
  SET_REFRESH: (state, refresh) => {
    state.refresh = refresh;
  },
};

const actions = {
  async init({ dispatch }) {
    const watchs = await window.electron.lowdb.get("watchs");
    dispatch("setList", {
      list: watchs,
      options: { save: false },
    });
  },
  setRestoreFromProjects({ state, dispatch }, path) {
    const watchEntry = state.list.find((entry) =>
      path.startsWith(entry.path + "/")
    );
    if (!watchEntry) {
      return;
    }
    if (!watchEntry.list.includes(path)) {
      watchEntry.list.push(path); // 앞에 추가 (정렬 목적이면 sort 로직 추가 가능)
      watchEntry.count = watchEntry.list.length;
    }
    window.electron.lowdb.set(
      "watchs",
      devalue.parse(devalue.stringify(watchEntry))
    );
    dispatch("setList", {
      list: state.list,
      options: { save: false },
    });
  },
  setList({ dispatch, commit, rootState }, { list, options = { save: true } }) {
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
  setRefresh({ commit }, refresh) {
    commit("SET_REFRESH", refresh);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
