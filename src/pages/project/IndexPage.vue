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
              v-if="!project?.isFileExists && project?.git?.remotes.length > 0"
              icon="mdi-backup-restore"
              color="light-green"
              round
              dense
              @click="visibleRestore = true"
            )

          action-btn.flex.q-gutter-sm.justify-end(v-if="project?.isFileExists" :info="info" type="connect")
        q-list
          q-item-label(header :style="`width: ${labelWidth};`")
            q-icon.q-mr-sm(name="mdi-pin" size="20px" color="white")
            | 기본정보
          label-value(v-if="info?.path" label="경로" :value="info?.path" :width="labelWidth")
          label-value(label="이름" :value="info?.name" :width="labelWidth")
          label-value(v-if="info?.version" label="버전" :value="info?.version" :width="labelWidth")
          label-value(v-if="info?.description" label="설명" :value="info?.description" :width="labelWidth")
          label-value(v-if="info?.license" label="라이센스" :value="info?.license" :width="labelWidth")
          label-value(v-if="info?.envs?.length > 0" label=".env" :value="info?.envs" :width="labelWidth")
          label-value(label="디렉토리 크기" :value="info?.size" :width="labelWidth")

          template(v-if="info?.git")
            q-item-label(header :style="`width: ${labelWidth};`")
              q-icon.q-mr-sm(name="mdi-git" size="20px" color="white")
              | Git 정보
            label-value(v-if="info?.git?.currentBranch" label="브랜치" :value="info?.git?.currentBranch" :width="labelWidth")
            label-value(v-if="info?.git?.remotes.length > 0" label="remote" :value="remotes" :width="labelWidth")
            label-value(v-if="info?.git?.lastCommit?.message" label="마지막 커밋" :value="info?.git?.lastCommit?.message" :width="labelWidth")

  popup-restore(v-model="visibleRestore" :project="info" @hide="visibleRestore = false" @restored="fetchProject")
</template>

<script>
import { mapGetters } from "vuex";

import ActionBtn from "@/components/ContextMenu/ActionBtn.vue";
import ProjectMenu from "@/components/ContextMenu/ProjectMenu.vue";
import FlatInput from "@/components/Form/FlatInput.vue";
import LabelValue from "@/components/Form/LabelValue.vue";
import PopupRestore from "@/components/Popup/Restore/IndexPage.vue";

export default {
  name: "ProjectPage",
  components: {
    FlatInput,
    LabelValue,
    ProjectMenu,
    PopupRestore,
    ActionBtn,
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
  data() {
    return {
      id: null,
      labelWidth: "130px",
      info: null,
      projectName: "",
      visibleRestore: false,
    };
  },
  methods: {
    fetchProject() {
      this.info = this.$_.cloneDeep(this.project);
      this.projectName = this.project.projectName;
      window.electron.invoke("cmd:info-project", {
        id: this.project.id,
      });

      // 현재 프로젝트 정보 업데이트
      this.handleProjectUpdate = (data) => {
        if (data.type === "cache") {
          this.info = data.data;
        } else if (data.type === "updated") {
          this.info = data.data;

          window.electron.removeListener(
            "event:info-project-updated",
            this.handleProjectUpdate
          );
          this.$store.dispatch("projects/init");
        }
      };

      window.electron.on(
        "event:info-project-updated",
        this.handleProjectUpdate
      );
    },
    changeProjectName() {
      if (this.projectName === this.project.projectName) return;
      if (this.projectName === "") {
        this.$q.notify({
          type: "negative",
          message: "프로젝트 이름은 비워둘 수 없습니다.",
        });
        this.projectName = this.project.projectName;
        return;
      }
      window.electron
        .invokeWithReply("cmd:update-project-name", {
          id: this.project.id,
          projectName: this.projectName,
        })
        .then((result) => {
          const { success, error } = result;
          if (success) {
            this.$store.dispatch("projects/setProjectName", {
              id: this.project.id,
              projectName: this.projectName,
            });
          } else {
            this.$q.notify({
              type: "negative",
              message: error || "프로젝트 이름 변경에 실패했습니다.",
            });
            this.projectName = this.project.projectName;
          }
        });
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
