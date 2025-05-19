<template lang="pug">
q-btn-dropdown(
  color="white"
  dropdown-icon="mdi-dots-vertical"
  flat
  no-icon-animation
  content-class="context"
)
  q-list
    q-item(
      clickable
      v-ripple
      @click="clickOpenFinder"
    )
      q-icon.q-mr-sm(name="mdi-folder-open" size="20px")
      | Finder 열기
    template(v-if="type === 'project'")
      q-item(
        clickable
        v-ripple
        @click="$emit('clickRemoveProject')"
      )
        q-icon.q-mr-sm(name="mdi-pill-off" size="20px")
        | 프로젝트 제거
      q-item(
        clickable
        v-ripple
        @click="$emit('clickRestoreProject')"
      )
        q-icon.q-mr-sm(name="mdi-archive-refresh-outline" size="20px")
        | 프로젝트 복구
    q-item(
      v-else-if="type === 'watch'"
      clickable
      v-ripple
      @click="$emit('clickAddProject')"
    )
      q-icon.q-mr-sm(name="mdi-pill" size="20px")
      | 프로젝트 등록
    q-item(
      clickable
      v-ripple
      @click="$emit('clickRemoveFolder')"
    )
      q-icon.q-mr-sm(name="mdi-package-variant-remove" size="20px")
      | 해당 폴더 삭제
</template>

<script>
export default {
  name: "ProjectMenu",
  props: {
    info: {
      type: Object,
      required: true,
    },
    type: {
      type: String,
      enum: ["project", "watch"],
      default: "project",
    },
  },
  emits: ["clickRemoveProject", "clickAddProject", "clickRemoveFolder"],
  methods: {
    // Finder 열기
    async clickOpenFinder() {
      const res = await window.electron.openFolder(this.info.path);
      if (!res.success) {
        this.$q.notify({
          type: "negative",
          message: "폴더 열기에 실패했습니다",
        });
      }
    },

    // 프로젝트 등록
    clickAddProject() {
      this.$q
        .dialog({
          title: "프로젝트 추가",
          message: "정말로 해당 폴더를 등록하시겠습니까?",
          persistent: true,
          cancel: true,
        })
        .onOk(async () => {
          window.electron
            .invokeWithReply("cmd:project-create", {
              path: this.info.path,
              name: this.info.projectName,
            })
            .then((result) => {
              const { success, id } = result;
              if (success) {
                // TODO: store에 등록
                this.$router.push({
                  name: "project",
                  params: {
                    id,
                  },
                });
                this.$q.notify({
                  type: "positive",
                  message: "프로젝트 등록에 성공했습니다",
                });
              }
            });
        });
    },

    // 해당 폴더 삭제
    async clickRemoveFolder() {
      this.$q
        .dialog({
          title: "폴더 삭제",
          message: "정말로 해당 폴더를 삭제하시겠습니까?",
          persistent: true,
          cancel: true,
        })
        .onOk(async () => {
          const res = await window.electron.removeFolder(this.info.path);
          if (!res.success) {
            this.$q.notify({
              type: "negative",
              message: "폴더 삭제에 실패했습니다",
            });
          }
        });
    },
  },
};
</script>

<style lang="scss" scoped>
.context {
  .q-item {
    min-height: auto;
  }
}
</style>
