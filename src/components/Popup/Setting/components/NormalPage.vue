<template lang="pug">
.normal-page
  q-form.q-gutter-md(ref="postForm")
    q-checkbox(v-model="postForm.openExe" label="시작시 자동실행" dense)

  Teleport(v-if="showActions" to="#right-actions")
    .row.q-gutter-x-sm
      q-btn(
        v-if="isEdit"
        label="취소"
        color="negative"
        dense
        unelevated
        :disable="loading"
        @click="clickCancel"
      )
      q-btn(
        v-if="isEdit"
        label="저장"
        color="primary"
        dense
        unelevated
        :disable="loading"
        @click="clickSave"
      )
      q-btn(
        v-else
        label="닫기"
        color="grey"
        dense
        unelevated
        :disable="loading"
        @click="$emit('close')"
      )
</template>

<script>
const defaultForm = {
  openExe: false,
};

export default {
  name: "NormalPage",
  computed: {
    isEdit() {
      return !this.$_.isEqual(this.originForm, this.postForm);
    },
    loading() {
      return this.selectedPaths.some(
        (path) => this.projectCounts[path]?.loading
      );
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.showActions = true;
    });
  },
  data() {
    return {
      originForm: this.$_.cloneDeep(defaultForm),
      postForm: this.$_.cloneDeep(defaultForm),
      originPaths: [],
      selectedPaths: [],
      projectCounts: {},
      showActions: false,
    };
  },
  methods: {
    async addFolder() {
      try {
        const result = await window.electron.selectFolder();
        if (result) {
          // 중복 체크
          if (!this.selectedPaths.includes(result)) {
            this.selectedPaths.push(result);
            // 프로젝트 수 계산 시작
            this.updateProjectCount(result);
          } else {
            // 중복된 경로 알림
            this.$q.notify({
              type: "warning",
              message: "이미 추가된 폴더입니다.",
              position: "top",
            });
          }
        }
      } catch (e) {
        this.$q.notify({
          type: "negative",
          message: "폴더 선택 중 오류가 발생했습니다.",
          position: "top",
        });
      }
    },

    removePath(index) {
      const path = this.selectedPaths[index];
      this.selectedPaths.splice(index, 1);
      // 프로젝트 카운트 데이터도 삭제
      delete this.projectCounts[path];
    },

    async updateProjectCount(path) {
      // 로딩 상태 설정
      this.projectCounts[path] = { loading: true, count: 0 };

      try {
        // 비동기로 프로젝트 수 계산 요청
        window.electron.getProjectCount(path).then((result) => {
          // 로딩 완료 및 결과 설정
          this.projectCounts[path] = {
            loading: false,
            count: result.success ? result.count : 0,
          };
        });
      } catch (e) {
        console.error(`프로젝트 수 계산 오류 (${path}):`, e);
        this.projectCounts[path] = {
          loading: false,
          count: 0,
        };
      }
    },

    clickCancel() {
      this.postForm = this.$_.cloneDeep(this.originForm);
    },

    clickSave() {
      console.log("clickSave");
    },
  },
};
</script>

<style lang="scss" scoped></style>
