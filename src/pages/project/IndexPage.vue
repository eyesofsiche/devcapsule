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
          )
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
              q-item(
                clickable
                v-ripple
                @click="clickkRegister"
              )
                q-icon.q-mr-sm(name="mdi-pill-off" size="20px")
                | 프로젝트 제거
              q-item(
                clickable
                v-ripple
                @click="clickkRemove"
              )
                q-icon.q-mr-sm(name="mdi-archive-refresh-outline" size="20px")
                | 프로젝트 복구
              q-item(
                clickable
                v-ripple
                @click="clickkRemove"
              )
                q-icon.q-mr-sm(name="mdi-archive-minus-outline" size="20px")
                | 프로젝트 삭제

        q-list
          q-item-label(header :style="`width: ${labelWidth};`")
            q-icon.q-mr-sm(name="mdi-pin" size="20px" color="white")
            | 기본정보
          label-value(label="경로" :value="info?.path" :width="labelWidth")
          label-value(label="이름" :value="info?.name" :width="labelWidth")
          label-value(label="버전" :value="info?.version" :width="labelWidth")
          label-value(label="설명" :value="info?.description" :width="labelWidth")
          label-value(label="라이센스" :value="info?.license" :width="labelWidth")
          label-value(label="디렉토리 크기" :value="info?.size" :width="labelWidth")

          template(v-if="info?.git")
            q-item-label(header :style="`width: ${labelWidth};`")
              q-icon.q-mr-sm(name="mdi-git" size="20px" color="white")
              | Git 정보
            label-value(label="브랜치" :value="info?.git?.currentBranch" :width="labelWidth")
            label-value(label="remote" :value="info?.git?.remotes[0]" :width="labelWidth")
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

import FlatInput from "@/components/Form/FlatInput.vue";
import LabelValue from "@/components/Form/LabelValue.vue";

export default {
  name: "RegisterPage",
  components: {
    FlatInput,
    LabelValue,
  },
  computed: {
    ...mapGetters(["projects"]),
  },
  watch: {
    $route: {
      handler(to, from) {
        if (to.query.id === undefined) {
          this.path = null;
          return;
        }
        this.project = this.projects.list.find(
          (item) => item.id === to.query.id
        );
        this.fetchProject();
      },
      immediate: true,
    },
  },
  mounted() {},
  data() {
    return {
      labelWidth: "130px",
      projectName: "",
      project: null,
      path: null,
      info: null,
    };
  },
  methods: {
    fetchProject() {
      // console.log(path);
      this.info = null;
      this.projectName = "";
      window.electron
        .invokeWithReply("cmd:project-info", {
          path: this.project.path,
        })
        .then((result) => {
          const { success } = result;
          if (success) {
            console.log(result);
            this.info = result;
            this.projectName = this.project.name;
          }
        });
    },
    async clickOpenFinder() {
      const res = await window.electron.openFolder(this.path);
      if (!res.success) {
        this.$q.notify({
          type: "negative",
          message: "폴더 열기에 실패했습니다",
        });
      }
    },
    clickkRegister() {
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
              path: this.path,
              name: this.projectName,
            })
            .then((result) => {
              const { success, id } = result;
              if (success) {
                // this.info = result;
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
    async clickkRemove() {
      this.$q
        .dialog({
          title: "폴더 삭제",
          message: "정말로 해당 폴더를 삭제하시겠습니까?",
          persistent: true,
          cancel: true,
        })
        .onOk(async () => {
          const res = await window.electron.removeFolder(this.path);
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
.context {
  .q-item {
    min-height: auto;
  }
}
</style>
