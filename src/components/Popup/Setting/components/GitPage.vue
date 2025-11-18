<template lang="pug">
.normal-page
  .text-caption 
    div 프로젝트 환경 변수(.env)를 Git 저장소에 백업할 수 있습니다.
    div.text-red.q-mt-xs.text-weight-bold ⚠️ 반드시 비공개(Private) 저장소를 사용하세요!
  
  .q-mt-sm.q-pa-sm.bg-grey-10.rounded-borders.text-caption
    .text-weight-bold.q-mb-xs 📌 주요 사항
    ul.q-pl-md.q-my-none
      li 
        strong devcapsule 
        | 전용 브랜치가 자동 생성됩니다 (기존 코드와 분리)
      li 
        | Devcapsule에서 관리하는 파일만 백업됩니다:
      li.text-red 그 외 파일은 동기화 시 자동 삭제되니 주의하세요
      li Personal Access Token 또는 SSH 키 인증 필요
      li 여러 PC 사용 시 최신 변경사항이 우선 적용됩니다
  
  q-form.q-mt-md.q-gutter-md(ref="postForm")
    q-input(
      v-model="postForm.gitPath"
      label="Git 저장소 주소"
      outlined
      dense
      :loading="loading"
      :readonly="loading || isTest"
      :clearable="isTest"
    )
      template(v-if="isTest" v-slot:append)
        q-icon.cursor-pointer(name="close" @click="clickCancelTest")
  
  Teleport(v-if="showActions" to="#right-actions")
    .row.q-gutter-x-sm
      template(v-if="isEdit")
        q-btn(
          label="취소"
          color="negative"
          dense
          unelevated
          :disable="loading"
          @click="clickCancel"
        )
        q-btn(
          v-if="isTest"
          label="저장"
          color="positive"
          dense
          unelevated
          :disable="loading"
          @click="clickSave"
        )
        q-btn(
          v-else
          label="TEST"
          color="warning"
          dense
          unelevated
          :disable="loading"
          @click="clickTest"
        )
      template(v-else)
        q-btn(
          label="닫기"
          color="grey"
          dense
          unelevated
          :disable="loading"
          @click="$emit('close')"
        )
</template>

<script>
import { mapGetters } from "vuex";

const defaultForm = {
  autoRun: false,
  autoRefresh: false,
  gitPath: "",
  theme: "dark",
  language: "ko",
};

export default {
  name: "GitPage",
  computed: {
    ...mapGetters(["settings"]),
    isEdit() {
      return !this.$_.isEqual(this.originForm, this.postForm);
    },
  },
  watch: {
    settings: {
      handler(val) {
        console.log("settings", val);
        this.init(val);
      },
      deep: true,
      immediate: true,
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.showActions = true;
    });
  },
  data() {
    return {
      loading: false,
      showActions: false,

      originForm: this.$_.cloneDeep(defaultForm),
      postForm: this.$_.cloneDeep(defaultForm),
      isTest: false,
    };
  },
  methods: {
    init(val) {
      this.originForm = this.$_.cloneDeep(val);
      this.postForm = this.$_.cloneDeep(val);

      if (this.postForm.gitPath) this.isTest = true;
    },
    clickCancel() {
      this.init(this.settings);
    },

    clickCancelTest() {
      this.originForm.gitPath = "";
      this.isTest = false;
    },

    async clickTest() {
      this.loading = true;
      window.electron
        .invokeWithReply("cmd:backup-repo-test", {
          path: this.postForm.gitPath,
        })
        .then((check) => {
          if (check.success) {
            this.isTest = true;
            this.$q.notify({
              type: "positive",
              message: "Git 저장소 연결 테스트에 성공했습니다.",
            });
          } else {
            this.isTest = false;
            let errorMessage = "Git 저장소 연결 테스트에 실패했습니다.";
            if (check.errorType === "GIT_NOT_FOUND") {
              errorMessage += " Git이 시스템에서 발견되지 않습니다.";
            } else if (check.errorType === "AUTH_FAILED") {
              errorMessage += " 인증에 실패했습니다. 자격 증명을 확인하세요.";
            } else {
              errorMessage += ` 오류: ${check.error}`;
            }
            this.$q.notify({
              type: "negative",
              message: errorMessage,
            });
          }
        })
        .finally(() => {
          this.loading = false;
        });
    },

    async clickSave() {
      this.loading = true;
      window.electron
        .invokeWithReply(
          "cmd:backup-repo-settings",
          {
            path: this.postForm.gitPath,
          },
          60000 // 60초 타임아웃 (Git 작업은 시간이 오래 걸릴 수 있음)
        )
        .then(async (check) => {
          if (check.success) {
            await this.$store.dispatch("settings/readSettings");
            this.$q.notify({
              type: "positive",
              message: "Git 저장소 설정이 저장되었습니다.",
            });
            this.isTest = false;
          } else {
            this.$q.notify({
              type: "negative",
              message: `Git 저장소 설정에 실패했습니다. 오류: ${check.error}`,
            });
          }
        })
        .finally(() => {
          this.loading = false;
        });
    },
  },
};
</script>

<style lang="scss" scoped></style>
