<template lang="pug">
  q-dialog(ref="dialog" :model-value="modelValue" no-backdrop-dismiss backdrop-filter="blur(4px)")
    q-card.q-dialog-plugin.q-pa-md
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
        q-tab(name="git" icon="mdi-git" label="저장소")
        q-tab(name="folder" icon="mdi-folder-sync-outline" label="감시폴더")
        //- q-tab(name="folder2" icon="source" label="감시폴더")
      q-separator
      q-tab-panels(v-model="tab" animated style="height: 300px")
        q-tab-panel(name="normal")
        q-tab-panel(name="folder")
          folder-page(ref="folderPage")
      q-card-actions(align="between")
        .left
          q-btn(
            v-if="['folder'].includes(tab)"
            label="추가"
            icon="mdi-folder-plus-outline"
            color="green"
            dense
            unelevated
            @click="addFolder"
          )
        .right
          q-btn(label="닫기" color="primary" dense unelevated)
  </template>

<script>
import FolderPage from "./components/FolderPage.vue";

export default {
  name: "SettingPage",
  components: {
    FolderPage,
  },
  props: {
    modelValue: Boolean,
  },
  data() {
    return {
      tab: "folder",
    };
  },
  methods: {
    addFolder() {
      this.$refs.folderPage.addFolder();
      console.log("addFolder");
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
