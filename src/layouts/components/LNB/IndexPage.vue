<template lang="pug">
.sidebar
  q-list.full-width
    q-item
      q-item-section
        q-btn.full-width(
          :icon="listView === 'projects' ? 'grid_view' : 'arrow_back'"
          align="left"
          :color="listView === 'projects' ? '201F27' : 'primary'"
          :flat="listView === 'projects'"
          dense
          @click="clickListToggle"
        ) 미등록 프로젝트
          template(v-if="watchs.length < 1")
            q-tooltip.bg-red(
              anchor="center middle"
              self="center middle"
              transition-show="scale"
              transition-hide="scale"
            ) 감시폴더를 추가해주세요.
            q-badge.q-ml-sm(label="!" color="red" rounded)
          template(v-else-if="unregisteredProjectCount > 0")
            q-badge.q-ml-sm(:label="unregisteredProjectCount" color="red" rounded)
      q-item-section(avatar)
        q-btn(round dense color="brown-5" icon="refresh" @click="clickRefresh" :loading="loadingRefresh")
    q-separator
    list-sec(:listView="listView")
    q-separator
    q-item(v-ripple)
      q-item-section
        q-btn.full-width(
          icon="settings"
          align="left"
          color="201F27"
          flat
          dense
          @click="visibleSetting = true"
        ) 설정

  popup-setting(v-model="visibleSetting" @hide="visibleSetting = false")
</template>

<script>
import { mapGetters } from "vuex";

import PopupSetting from "@/components/Popup/Setting/IndexPage.vue";

import ListSec from "./ListSec.vue";

export default {
  name: "LNB",
  components: {
    PopupSetting,
    ListSec,
  },
  computed: {
    ...mapGetters(["watchs", "projects", "refresh"]),
    totalProjectCount() {
      return this.watchs
        .map((item) => item.count)
        .reduce((acc, curr) => acc + curr, 0);
    },
    unregisteredProjectCount() {
      return this.totalProjectCount - (this.projects.length || 0);
    },
  },
  watch: {
    $route: {
      handler(to, from) {
        if (to.name === "register") {
          this.listView = "unregistered";
        } else {
          this.listView = "projects";
        }
      },
      immediate: true,
    },
    refresh: {
      handler(val) {
        this.$nextTick(() => {
          if (val) {
            this.clickRefresh();
          }
        });
      },
    },
  },
  data() {
    return {
      listView: "projects",
      visibleSetting: false,
      loadingRefresh: false,
    };
  },
  methods: {
    clickListToggle() {
      if (this.listView === "projects") {
        this.$router.push({ name: "register" });
      } else {
        this.$router.push({ name: "home" });
      }
    },
    clickRefresh() {
      this.$store.dispatch("watchs/setRefresh", false);
      this.loadingRefresh = true;
      window.electron
        .manualRefresh()
        .then((req) => {
          const { success, error, result, cancel } = req;
          if (success) {
            this.$store.dispatch("watchs/setList", {
              list: result,
              options: { save: false },
            });
            this.loadingRefresh = false;
          } else if (!cancel) {
            this.$q.notify({
              type: "negative",
              message: error,
            });
          }
        })
        .catch((err) => {
          this.loadingRefresh = false;
          this.$q.notify({
            type: "negative",
            message: err,
          });
        });
    },
  },
};
</script>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  width: 300px;
  height: 100vh;
  border-right: 1px solid #2e2e2f;
  background-color: #2d2d2d;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1;

  .q-item {
    padding: 8px;
  }

  .q-btn.active {
    background-color: #201f27;
  }
}

.q-item {
  gap: 8px;
}
.q-item__section--main ~ .q-item__section--side {
  padding-left: 0;
}
.q-item__section--avatar {
  min-width: auto;
}
</style>
