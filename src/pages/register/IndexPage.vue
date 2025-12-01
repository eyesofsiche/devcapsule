<template lang="pug">
q-page(:class="!path ? 'flex flex-center' : ''")
  template(v-if="!path")
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
            v-model="info.projectName"
            outlined
            readonly
          )

        .action-btns.row.justify-between
          .col.q-gutter-sm
            q-btn(
              v-if="info?.isBeforeProject"
              icon="mdi-connection"
              color="deep-orange"
              round
              dense
              :disable="isLoading"
              @click="clickConnectProject"
            )
              q-tooltip 기존 프로젝트 연결
            q-btn(
              icon="mdi-database-plus-outline"
              color="warning"
              round
              dense
              :disable="isLoading"
              @click="clickAddProject"
            )
              q-tooltip 새 프로젝트 등록
          action-btn.flex.q-gutter-sm.justify-end(:info="info" type="connect")
        q-list
          q-item-label(header :style="`width: ${labelWidth};`")
            q-icon.q-mr-sm(name="mdi-pin" size="20px" color="white")
            | 기본정보
          label-value(label="경로" :value="info?.path" :width="labelWidth")
          label-value(label="이름" :value="info?.name" :width="labelWidth")
          label-value(label="버전" :value="info?.version" :width="labelWidth")
          label-value(label="설명" :value="info?.description" :width="labelWidth")
          label-value(label="라이센스" :value="info?.license" :width="labelWidth")
          label-value(v-if="info?.envs?.length > 0" label="백업대상 (.env)" :value="info?.envs" :width="labelWidth")
          label-value(label="디렉토리 크기" :value="info?.size" :width="labelWidth")
          
          template(v-if="info?.git")
            q-item-label(header :style="`width: ${labelWidth};`")
              q-icon.q-mr-sm(name="mdi-git" size="20px" color="white")
              | Git 정보
            label-value(label="브랜치" :value="info?.git?.currentBranch" :width="labelWidth")
            label-value(v-if="info?.git?.remotes.length > 0" label="remote" :value="remotes" :width="labelWidth")
            label-value(label="마지막 커밋" :value="info?.git?.lastCommit?.message" :width="labelWidth")
</template>

<script>
import { mapGetters } from "vuex";

import ActionBtn from "@/components/ContextMenu/ActionBtn.vue";
import FlatInput from "@/components/Form/FlatInput.vue";
import LabelValue from "@/components/Form/LabelValue.vue";

const defaultInfo = {
  projectName: "",
  path: "",
};

export default {
  name: "RegisterPage",
  components: {
    FlatInput,
    LabelValue,
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
  },
  watch: {
    $route: {
      handler(to) {
        if (to.query.path === undefined) {
          this.path = null;
          return;
        }
        this.path = to.query.path;
        this.fetchProject(this.path);
      },
      immediate: true,
    },
  },
  mounted() {},
  data() {
    return {
      isLoading: false,
      labelWidth: "130px",
      projectName: "",
      path: null,
      info: this.$_.cloneDeep(defaultInfo),
    };
  },
  methods: {
    fetchProject(path) {
      this.info = this.$_.cloneDeep(defaultInfo);
      this.projectName = "";
      window.electron
        .invokeWithReply("cmd:info-project", {
          path,
        })
        .then((result) => {
          const { success } = result;
          console.log(JSON.stringify(result, 0, 2));
          if (success) {
            this.info = result;
            this.info.path = path;
            this.info.projectName =
              this.info?.name || this.path.split("/").pop();
          }
        });
    },
    clickConnectProject() {
      this.$q
        .dialog({
          title: "기존 프로젝트 연결",
          message:
            "동일한 내용의 프로젝트가 이미 존재합니다.<br>연결하시겠습니까?",
          html: true,
          persistent: true,
          cancel: true,
        })
        .onOk(async () => {
          this.isLoading = true;
          window.electron
            .invokeWithReply("cmd:connect-project", {
              projectId: this.info.matchedProjectId,
              path: this.info.path,
            })
            .then(async (result) => {
              const { success, id, error } = result;
              console.log(JSON.stringify(result, null, 2));
              console.log("error", error);
              this.complete("connect", success, id, error, this.info.path);
            })
            .finally(() => {
              this.isLoading = false;
            });
        });
    },
    clickAddProject() {
      const message = this.info.isBeforeProject
        ? '<span class="text-deep-orange">동일한 내용의 프로젝트가 이미 존재합니다.</span><br>정말 새 프로젝트로 등록하시겠습니까?'
        : "해당 폴더를 새 프로젝트로 등록하시겠습니까?";
      this.$q
        .dialog({
          title: "새 프로젝트 등록",
          message: message,
          html: true,
          persistent: true,
          cancel: true,
        })
        .onOk(async () => {
          this.isLoading = true;
          window.electron
            .invokeWithReply("cmd:create-project", {
              path: this.info.path,
              name: this.info.projectName,
            })
            .then(async (result) => {
              const { success, id, error } = result;
              this.complete("create", success, id, error, this.info.path);
            })
            .finally(() => {
              this.isLoading = false;
            });
        });
    },

    async complete(type, success, id, error, path) {
      if (success) {
        await this.$store.dispatch("watchs/addProject", {
          path,
        });
        this.$router.push({
          name: "project",
          query: {
            id,
          },
        });
        const message =
          type === "connect"
            ? "프로젝트 연결에 성공했습니다"
            : "프로젝트 등록에 성공했습니다";
        this.$q.notify({
          type: "positive",
          message,
        });
      } else {
        this.$q.notify({
          type: "negative",
          message: error,
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
