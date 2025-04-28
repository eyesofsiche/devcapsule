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
      q-tab(name="git" icon="mdi-git" label="저장소")
      q-tab(name="folder" icon="mdi-folder-sync-outline" label="감시폴더")
    q-separator

    q-tab-panels(v-model="tab" animated style="height: 300px")
      q-tab-panel(name="normal")
        .text-center 일반 설정
      q-tab-panel(name="folder")
        folder-page(
          ref="folderPage"
        )

    q-card-actions(align="between")
      #left-actions
      #right-actions
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
  // directives: {
  //   // v-append-to-actions 를 쓴 엘리먼트를
  //   // q-card-actions 의 왼쪽(.left) 컨테이너로 옮겨 줌
  //   appendToActions: {
  //     mounted(el) {
  //       // q-dialog 안에 있는 q-card-actions.left 찾기
  //       // (필요하다면 ID, data-attr 등으로 더 특정해 주세요)
  //       const dialog = document.querySelector(".q-dialog__inner");
  //       console.log(dialog);
  //       if (!dialog) return;
  //       const actions = dialog.querySelector(".q-card-actions .left");
  //       if (actions) {
  //         actions.appendChild(el);
  //       }
  //     },
  //     unmounted(el) {
  //       el.remove();
  //     },
  //   },
  // },
  data() {
    return {
      tab: "folder",
    };
  },
  methods: {
    addFolder() {
      this.$refs.folderPage.addFolder();
    },
    onClose() {
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
