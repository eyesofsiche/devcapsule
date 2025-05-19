<template lang="pug">
.watch-page
  .text-caption 프로젝트를 찾을 폴더를 선택해 주세요.

  q-list.q-mt-md(separator bordered)
    q-item(
      v-for="(path, idx) in selectedPaths"
      :key="idx"
      :loading="projectCounts[path]?.loading"
    )
      q-item-section(style="min-height: 42px;")
        q-item-label {{ path }}
        q-item-label(caption)
          template(v-if="projectCounts[path]?.loading")
            span 프로젝트 찾는 중...
          template(v-else)
            | {{ projectCounts[path]?.count || 0 }} 프로젝트 감지됨
        q-inner-loading(:showing="projectCounts[path]?.loading")
          q-spinner-facebook(size="20px" color="primary")
      q-item-section(v-if="!projectCounts[path]?.loading" side)
        q-btn(
          flat
          round
          color="negative"
          icon="delete"
          @click="removePath(idx)"
        )

    q-item(v-if="selectedPaths.length < 1")
      q-item-section.text-grey.text-center(style="min-height: 42px;")
        | 선택된 폴더가 없습니다.
  
  Teleport(v-if="showActions" to="#left-actions")
    q-btn(
      label="추가"
      icon="mdi-folder-plus-outline"
      color="green"
      dense
      unelevated
      @click="addFolder"
    )
  Teleport(v-if="showActions" to="#right-actions")
    .row.q-gutter-x-sm
      q-btn(
        v-if="isEdit"
        label="취소"
        color="negative"
        dense
        :disable="loading"
        @click="clickCancel"
      )
      q-btn(
        v-if="isEdit"
        label="저장"
        color="primary"
        dense
        :disable="loading"
        @click="clickSave"
      )
      q-btn(
        v-if="!isEdit"
        label="닫기"
        color="grey"
        dense
        :disable="loading"
        @click="$emit('close')"
      )
</template>

<script>
import { mapGetters } from "vuex";

export default {
  name: "WatchPage",
  computed: {
    ...mapGetters(["watchs"]),
    isEdit() {
      if (this.originPaths.length !== this.selectedPaths.length) {
        return true;
      }
      return this.originPaths.some(
        (path) => !this.selectedPaths.includes(path)
      );
    },
    loading() {
      return this.selectedPaths.some(
        (path) => this.projectCounts[path]?.loading
      );
    },
  },
  watch: {
    watchs: {
      handler(val) {
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
      originPaths: [],
      selectedPaths: [],
      projectCounts: {},
      showActions: false,
    };
  },
  methods: {
    init(val) {
      if (val.length === 0) {
        this.originPaths = [];
        this.selectedPaths = [];
        this.projectCounts = {};
        return;
      }
      const paths = val.map((item) => item.path);
      this.originPaths = this.$_.cloneDeep(paths);
      this.selectedPaths = this.$_.cloneDeep(paths);
      this.projectCounts = paths.reduce((acc, path) => {
        acc[path] = {
          loading: false,
          count: val.find((item) => item.path === path)?.count || 0,
        };
        return acc;
      }, {});
    },
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

    async updateProjectCount(path) {
      // 로딩 상태 설정
      this.projectCounts[path] = { loading: true, count: 0 };

      try {
        // 비동기로 프로젝트 수 계산 요청
        window.electron
          .invokeWithReply("cmd:scan-project", { path })
          .then((result) => {
            // 로딩 완료 및 결과 설정
            this.projectCounts[path] = {
              loading: false,
              count: result.success ? result.count : 0,
              list: result.success ? result.list : [],
            };
          });
      } catch (e) {
        console.error(`프로젝트 수 계산 오류 (${path}):`, e);
        this.projectCounts[path] = {
          loading: false,
          count: 0,
          list: [],
        };
      }
    },

    removePath(index) {
      const path = this.selectedPaths[index];
      this.selectedPaths.splice(index, 1);
      delete this.projectCounts[path];
    },

    clickCancel() {
      this.init(this.watchs);
    },

    clickSave() {
      const formattedData = this.selectedPaths.map((path) => ({
        path,
        count: this.projectCounts[path]?.count || 0,
        list: this.projectCounts[path]?.list || [],
      }));

      this.$store.dispatch("watchs/setList", {
        list: formattedData,
      });
      this.clickCancel();
    },
  },
};
</script>

<style lang="scss" scoped></style>
