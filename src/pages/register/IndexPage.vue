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
          )
          project-menu(
            type="watch"
            :info="info"
          )

        q-list
          q-item-label(header :style="`width: ${labelWidth};`")
            q-icon.q-mr-sm(name="mdi-pin" size="20px" color="white")
            | 기본정보
          label-value(label="경로" :value="info?.path" :width="labelWidth")
          label-value(label="이름" :value="info?.name" :width="labelWidth")
          label-value(label="버전" :value="info?.version" :width="labelWidth")
          label-value(label="설명" :value="info?.description" :width="labelWidth")
          label-value(label="라이센스" :value="info?.license" :width="labelWidth")
          label-value(v-if="info?.envs.length > 0" label="백업대상 (.env)" :value="info?.envs" :width="labelWidth")
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

const defaultInfo = {
  projectName: "",
  path: "",
};

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
  },
  watch: {
    $route: {
      handler(to, from) {
        if (to.query.index === undefined) {
          this.path = null;
          return;
        }
        this.path = this.projects.unreg[to.query.index];
        this.fetchProject(this.path);
      },
      immediate: true,
    },
  },
  mounted() {},
  data() {
    return {
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
          if (success) {
            console.log(result);
            this.info = result;
            this.info.path = path;
            this.info.projectName =
              this.info?.name || this.path.split("/").pop();
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
