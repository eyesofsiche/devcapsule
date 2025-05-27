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
        @click="clickRemoveProject"
      )
        q-icon.q-mr-sm(name="mdi-pill-off" size="20px")
        | 프로젝트 제거
      q-item(
        clickable
        v-ripple
        @click="clickRestoreProject"
        :disable="info.isFileExists"
      )
        q-icon.q-mr-sm(name="mdi-archive-refresh-outline" size="20px")
        | 프로젝트 복구
    q-item(
      v-else-if="type === 'watch'"
      clickable
      v-ripple
      @click="clickAddProject"
      :disable="!hasOriginRemote"
    )
      q-icon.q-mr-sm(name="mdi-pill" size="20px")
      | 프로젝트 등록
      template(v-if="!hasOriginRemote")
        q-tooltip(
          anchor="center left"
          self="center right"
          :offset="[0, 0]"
          transition-show="jump-left"
          transition-hide="jump-right"
        ) Git 원격 저장소(origin)가 설정된 경우에만 등록할 수 있습니다.
    q-item(
      clickable
      v-ripple
      @click="clickRemoveFolder"
      :disable="!info.isFileExists && type === 'project'"
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
  computed: {
    hasOriginRemote() {
      return this.info.git?.remotes?.some((r) => r.name === "origin");
    },
  },
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
          title: "프로젝트 등록",
          message: "정말로 해당 폴더를 등록하시겠습니까?",
          persistent: true,
          cancel: true,
        })
        .onOk(async () => {
          window.electron
            .invokeWithReply("cmd:create-project", {
              path: this.info.path,
              name: this.info.projectName,
            })
            .then(async (result) => {
              const { success, id, error } = result;
              if (success) {
                await this.$store.dispatch("watchs/addProject", {
                  path: this.info.path,
                });
                this.$router.push({
                  name: "project",
                  query: {
                    id,
                  },
                });
                this.$q.notify({
                  type: "positive",
                  message: "프로젝트 등록에 성공했습니다",
                });
              } else {
                this.$q.notify({
                  type: "negative",
                  message: error,
                });
              }
            });
        });
    },

    // 프로젝트 제거
    clickRemoveProject() {
      this.$q
        .dialog({
          title: "프로젝트 제거",
          message: "정말로 해당 프로젝트를 제거하시겠습니까?",
          persistent: true,
          cancel: true,
        })
        .onOk(async () => {
          window.electron
            .invokeWithReply("cmd:remove-project", {
              id: this.info.id,
            })
            .then(async (result) => {
              const { success } = result;
              if (success) {
                // 프로젝트 삭제 후 watchs에 추가
                this.$store.dispatch(
                  "watchs/setRestoreFromProjects",
                  this.info.path
                );
                await this.$store.dispatch("projects/init");
                this.$router.replace({
                  name: "home",
                });
              } else {
                this.$q.notify({
                  type: "negative",
                  message: "프로젝트 제거에 실패했습니다",
                });
              }
            });
        });
    },

    // 프로젝트 복구
    clickRestoreProject() {
      this.$q
        .dialog({
          title: "프로젝트 복구",
          message: "정말로 해당 프로젝트를 복구하시겠습니까?",
          persistent: true,
          cancel: true,
        })
        .onOk(async () => {
          // const res = await window.electron.restoreProject(this.info.path);
          // if (!res.success) {
          //   this.$q.notify({
          //     type: "negative",
          //     message: "프로젝트 복구에 실패했습니다",
          //   });
          // }
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
          const res = await window.electron.removeFolder({
            folderPath: this.info.path,
            projectId: this.info.id,
          });
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
