import * as devalue from "devalue";
import _ from "lodash";

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
    const list = await window.electron.lowdb.get("projects");
    dispatch("setList", {
      list: list.map((item) => {
        return {
          ...item,
          projectName: item.projectName || item.name,
        };
      }),
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
  setProjectName({ state, dispatch }, { id, projectName }) {
    const list = state.list.map((item) => {
      if (item.id === id) {
        return { ...item, projectName };
      }
      return item;
    });
    dispatch("setList", {
      list,
      options: { save: false },
    });
  },
  setUnreg({ commit }, list) {
    commit("SET_UNREG", _.orderBy(list));
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
