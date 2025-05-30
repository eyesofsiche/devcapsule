<template lang="pug">
//- div project
q-page(:class="!project ? 'flex flex-center' : ''")
  template(v-if="!project")
    img(
      src="@/assets/logo-1.png"
      width="400px"
    )
  template(v-else)
    q-card.layout
      q-card-section
        .row.items-center.q-gutter-sm.q-mb-md
          q-icon(
            name="mdi-subtitles-outline"
            size="30px"
            color="white"
          )
          flat-input.text-h6.col(
            v-model="projectName"
            outlined
            @blur="changeProjectName"
            @keyup.native.enter="event => event.target?.blur()"
          )
          project-menu(
            type="project"
            :info="project"
            @complete:remove-folder="fetchProject"
          )

        .action-btns.row.justify-between
          .col.q-gutter-sm
            q-btn(
              v-if="!project?.isFileExists"
              icon="mdi-backup-restore"
              color="light-green"
              round
              dense
              @click="clickRestore"
            )
          .col.flex.q-gutter-sm.justify-end(v-if="project?.isFileExists")
            q-btn(
              icon="mdi-apple-finder"
              color="blue-grey-4"
              round
              dense
              @click="clickOpenFinder"
            )
            q-btn(
              icon="mdi-console-line"
              color="grey-8"
              round
              dense
              @click="clickOpenTerminal"
            )
            q-btn(
              icon="mdi-microsoft-visual-studio-code"
              color="primary"
              round
              dense
              @click="clickOpenVSCode"
            )
        q-list
          q-item-label(header :style="`width: ${labelWidth};`")
            q-icon.q-mr-sm(name="mdi-pin" size="20px" color="white")
            | 기본정보
          label-value(label="경로" :value="project?.path" :width="labelWidth")
          label-value(label="이름" :value="info?.name" :width="labelWidth")
          label-value(label="버전" :value="info?.version" :width="labelWidth")
          label-value(label="설명" :value="info?.description" :width="labelWidth")
          label-value(label="라이센스" :value="info?.license" :width="labelWidth")
          label-value(v-if="info?.envs?.length > 0" label=".env" :value="info?.envs" :width="labelWidth")
          label-value(label="디렉토리 크기" :value="info?.size" :width="labelWidth")

          template(v-if="info?.git")
            q-item-label(header :style="`width: ${labelWidth};`")
              q-icon.q-mr-sm(name="mdi-git" size="20px" color="white")
              | Git 정보
            label-value(label="브랜치" :value="info?.git?.currentBranch" :width="labelWidth")
            label-value(v-if="info?.git?.remotes.length > 0" label="remote" :value="remotes" :width="labelWidth")
            label-value(label="마지막 커밋" :value="info?.git?.lastCommit.message" :width="labelWidth")

          //- q-item-label(header :style="`width: ${labelWidth};`")
            q-icon.q-mr-sm(name="mdi-book-multiple" size="20px" color="white")
            | 의존성

          //- q-item-label(header :style="`width: ${labelWidth};`")
            q-icon.q-mr-sm(name="mdi-file-document-multiple" size="20px" color="white")
            | 구조

        
</template>

<script>
import { mapGetters } from "vuex";

import ProjectMenu from "@/components/ContextMenu/ProjectMenu.vue";
import FlatInput from "@/components/Form/FlatInput.vue";
import LabelValue from "@/components/Form/LabelValue.vue";

export default {
  name: "RegisterPage",
  components: {
    FlatInput,
    LabelValue,
    ProjectMenu,
  },
  computed: {
    ...mapGetters(["projects"]),
    remotes() {
      if (!this.info?.git?.remotes) return [];
      return this.info.git.remotes.map((remote) => {
        return `${remote.name} (${remote.url})`;
      });
    },
    project() {
      if (!this.id) return null;
      return this.projects.list.find((item) => item.id === this.id);
    },
  },
  watch: {
    $route: {
      handler(to, from) {
        if (!to.query.id) {
          this.id = null;
          return;
        }
        this.id = to.query.id;
        this.fetchProject();
      },
      immediate: true,
    },
  },
  mounted() {},
  data() {
    return {
      id: null,
      labelWidth: "130px",
      info: null,
      projectName: "",
    };
  },
  methods: {
    fetchProject() {
      this.info = null;
      this.projectName = this.project.name;
      window.electron
        .invokeWithReply("cmd:info-project", {
          path: this.project.path,
        })
        .then((result) => {
          const { success } = result;
          if (success) {
            this.info = result;
          }
        });
    },
    changeProjectName() {
      if (this.projectName === this.project.name) return;
      if (this.projectName === "") {
        this.$q.notify({
          type: "negative",
          message: "프로젝트 이름은 비워둘 수 없습니다.",
        });
        this.projectName = this.project.name;
        return;
      }
      window.electron
        .invokeWithReply("cmd:update-project-name", {
          id: this.project.id,
          name: this.projectName,
        })
        .then((result) => {
          const { success, error } = result;
          if (success) {
            this.$store.dispatch("projects/setProjectName", {
              id: this.project.id,
              name: this.projectName,
            });
          } else {
            this.$q.notify({
              type: "negative",
              message: error || "프로젝트 이름 변경에 실패했습니다.",
            });
            this.projectName = this.project.name;
          }
        });
    },

    clickRestore() {
      this.$q
        .dialog({
          title: "프로젝트 복원",
          message: "프로젝트를 복원하시겠습니까?",
          cancel: true,
          persistent: true,
        })
        .onOk(() => {
          this.$q.loading.show({
            message: "프로젝트 복원 중...",
          });
          window.electron
            .restoreProject(this.project.id)
            .then((result) => {
              const { success, error } = result;
              if (success) {
                this.$q.notify({
                  type: "positive",
                  message: "프로젝트가 복원되었습니다.",
                });
                this.fetchProject();
              } else {
                this.$q.notify({
                  type: "negative",
                  message: error || "프로젝트 복원에 실패했습니다.",
                });
              }
            })
            .finally(() => {
              this.$store.dispatch("settings/setAllPath");
              this.$q.loading.hide();
            });
        });
    },
    async clickOpenFinder() {
      const res = await window.electron.openFolder(this.info.path);
      if (!res.success) {
        this.$q.notify({
          type: "negative",
          message: "폴더 열기에 실패했습니다",
        });
      }
    },
    async clickOpenVSCode() {
      const res = await window.electron.openVSCode(this.info.path);
      if (!res.success) {
        this.$q.notify({
          type: "negative",
          message: res.error || "VSCode 열기에 실패했습니다",
        });
      }
    },
    async clickOpenTerminal() {
      const res = await window.electron.openTerminal(this.info.path);
      if (!res.success) {
        this.$q.notify({
          type: "negative",
          message: "터미널 열기에 실패했습니다",
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.q-item__label--header {
  text-align: right;
  padding-right: 0;
  border-bottom: 1px solid rgba($color: #eee, $alpha: 0.2);
}
.q-list {
  > .q-item__label {
    margin-top: 20px;
    margin-bottom: 10px;
  }
}
</style>
