<template lang="pug">
q-dialog(
  ref="dialog"
  :model-value="modelValue"
  no-backdrop-dismiss
  backdrop-filter="blur(4px)"
)
  q-card.q-dialog-plugin
    q-tabs(
      v-model="tab"
      active-color="primary"
      indicator-color="primary"
      narrow-indicator
      dense
      align="justify"
      dark
    )
      q-tab(name="normal" icon="mdi-cog-outline" label="일반")
      q-tab(name="watch" icon="mdi-folder-sync-outline" label="감시폴더")
      q-tab(name="git" icon="mdi-git" label="백업 저장소")
        q-badge(v-if="!settings.gitPath" rounded color="red" transparent align="bottom" floating)
    q-separator

    q-tab-panels(v-model="tab" animated style="height: 300px")
      q-tab-panel(name="normal")
        normal-page(@close="close")
      q-tab-panel(name="watch")
        watch-page(@close="close")
      q-tab-panel(name="git")
        git-page(@close="close")

    q-card-actions(align="between")
      #left-actions
      #right-actions
</template>

<script>
import { mapGetters } from "vuex";

import GitPage from "./components/GitPage.vue";
import NormalPage from "./components/NormalPage.vue";
import WatchPage from "./components/WatchPage.vue";

export default {
  name: "SettingPage",
  components: {
    NormalPage,
    GitPage,
    WatchPage,
  },
  props: {
    modelValue: Boolean,
  },
  computed: {
    ...mapGetters(["settings"]),
  },
  watch: {
    modelValue: {
      handler(val) {
        if (this.settings.autoRefresh) {
          window.electron.setAutoLaunch(!val);
        }
      },
    },
  },
  data() {
    return {
      tab: "normal",
    };
  },
  methods: {
    close() {
      this.$emit("update:modelValue", false);
    },
  },
};
</script>

<style lang="scss" scoped>
.q-card {
  padding: 0;
  .q-card__section {
    padding: 0;
  }
}

:deep(.q-tab) {
  background-color: rgb(60, 60, 60);
  .q-tab__content {
    // padding: 0;\
    .q-tab__label {
      font-size: 10px;
    }
  }
}

:deep(.q-tab-panels) {
  background-color: #282828;
}
</style>
