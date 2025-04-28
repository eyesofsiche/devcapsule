<template lang="pug">
.folder-page
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

    q-item(v-if="!selectedPaths.length")
      q-item-section.text-grey.text-center
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
      q-btn(label="닫기" color="primary" dense unelevated)
      q-btn(label="닫기" color="primary" dense unelevated)
</template>

<script>
export default {
  name: "FolderPage",
  data() {
    return {
      selectedPaths: [],
      projectCounts: {},
      showActions: false,
    };
  },
  mounted() {
    this.$nextTick(() => {
      this.showActions = true;
    });
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
  },
};
</script>

<style lang="scss" scoped></style>
