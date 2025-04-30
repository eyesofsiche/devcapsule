<template lang="pug">
q-layout(view="lhr LpR lFf" :dark="$q.dark.isActive")
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
            template(v-if="folders.length < 1")
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
      q-scroll-area.scroll
        template(v-if="listView === 'projects'")
          template(v-if="projects.length > 0")
          template(v-else)
            .text-caption.no-project
              q-icon(name="info" size="25px" color="white")
              | 등록된 프로젝트가 없습니다.
        template(v-else)
          .text-caption.no-project
            q-icon(name="info" size="25px" color="white")
            | 미등록 프로젝트
        //- q-item(v-ripple)
          q-item-section
            q-btn.full-width(
              icon="grid_view"
              align="left"
              color="201F27"
              flat
              dense
            ) project
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
  q-page-container
    router-view

  popup-setting(v-model="visibleSetting" @hide="visibleSetting = false")
</template>

<script>
import { mapGetters } from "vuex";

import PopupSetting from "@/components/Popup/Setting/IndexPage.vue";

export default {
  name: "MainLayout",
  components: {
    PopupSetting,
  },
  computed: {
    ...mapGetters(["folders", "projects"]),
    totalProjectCount() {
      return this.folders
        .map((item) => item.count)
        .reduce((acc, curr) => acc + curr, 0);
    },
    unregisteredProjectCount() {
      return this.totalProjectCount - this.projects.length;
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
      this.listView =
        this.listView === "projects" ? "unregistered" : "projects";
    },
    clickRefresh() {
      this.loadingRefresh = true;
      window.electron
        .invokeWithReply("cmd:force-refresh", {}, 5 * 60 * 1000)
        .then((req) => {
          const { success, error } = req;
          if (!success) {
            this.$q.notify({
              type: "negative",
              message: error,
            });
          }
        })
        .finally(() => {
          this.loadingRefresh = false;
        });
      // setTimeout(() => {
      //   this.loadingRefresh = false;
      // }, 3000);
      // this.$store.dispatch("refreshProject").then(() => {
      //   this.loadingRefresh = false;
      // });
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

.q-page-container {
  margin-left: 300px;
}

.scroll {
  height: calc(100vh - 102px);
}

.no-project {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  i {
    display: block;
    margin: 0 auto 10px;
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
