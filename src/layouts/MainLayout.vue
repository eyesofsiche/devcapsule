<template lang="pug">
q-layout(view="lhr LpR lFf" :dark="$q.dark.isActive")
  .sidebar
    q-list.full-width
      q-item(v-ripple)
        q-item-section
          q-btn.full-width.hover(
            icon="grid_view"
            align="left"
            color="201F27"
            flat
            dense
          ) 미등록 프로젝트
            template(v-if="folders.length < 1")
              q-tooltip.bg-red(
                anchor="center middle"
                self="center middle"
                transition-show="scale"
                transition-hide="scale"
              ) 감시폴더를 추가해주세요.
              q-badge(label="!" color="red" floating transparent rounded)
      q-separator
      q-scroll-area.scroll
      q-separator
      q-item(v-ripple)
        q-item-section
          q-btn.full-width(
            icon="settings"
            align="left"
            color="201F27"
            flat
            dense
            @click="settingVisible = true"
          ) 설정
  q-page-container
    router-view

  popup-setting(v-model="settingVisible" @hide="settingVisible = false")
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
  },
  data() {
    return {
      settingVisible: false,
    };
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

  .q-btn.hover {
    // background-color: #201f27;
  }
}

.q-page-container {
  margin-left: 300px;
}

.scroll {
  height: calc(100vh - 102px);
}
</style>
