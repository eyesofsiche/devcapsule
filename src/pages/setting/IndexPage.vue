<template lang="pug">
  q-page.q-pa-md.column(style="height: 100vh")
    //- 설명 배너
    q-banner.bg-grey-2.text-grey-9.q-mb-md(dense)
      | Dev Capsule은 지정한 상위 폴더들 아래에 있는 프로젝트들의
      code .env
      | 파일을 자동으로 감시하고 백업합니다.
      br
      | 작업 중인 프로젝트들이 모여 있는 상위 폴더들을 선택해주세요.
      br
      | 프로젝트의 기준은 .env 파일이 있는 폴더입니다.
  
    //- 폴더 리스트 영역
    div.flex-grow
      //- 폴더 추가 버튼
      q-btn.q-mb-md(
        label="폴더 추가"
        icon="add"
        color="primary"
        outline
        @click="selectFolder"
      )
  
      //- 폴더 리스트
      q-list.q-mt-md(separator bordered)
        q-item(
          v-for="(path, index) in selectedPaths"
          :key="index"
          class="q-py-md"
        )
          q-item-section
          q-item-label {{ path }}
          q-item-label(caption)
            template(v-if="projectCounts[path]?.loading")
              q-spinner-dots(color="primary" size="1em")
              span.q-ml-sm 프로젝트 수 계산 중...
            template(v-else)
              | {{ projectCounts[path]?.count || 0 }} 프로젝트 감지됨
          q-item-section(side)
            q-btn(
              flat
              round
              color="negative"
              icon="delete"
              @click="removePath(index)"
            )
        
        //- 경로가 없을 때 표시할 메시지
        q-item(v-if="!selectedPaths.length")
          q-item-section(class="text-grey text-center")
            | 감시할 폴더를 추가해주세요
  
    //- 적용 버튼
    div.row.justify-end.q-mt-md
      q-btn(
        label="적용"
        color="primary"
        unelevated
        :disable="!selectedPaths.length"
        @click="applyPaths"
      )
  </template>

<script>
export default {
  data() {
    return {
      selectedPaths: [],
      projectCounts: {}, // { path: { loading: boolean, count: number } }
    };
  },

  methods: {
    async selectFolder() {
      try {
        const result = await window.electron.selectFolder();
        console.log("result", result);
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
        console.error("폴더 선택 오류:", e);
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
      console.log("updateProjectCount", path);
      this.projectCounts[path] = { loading: true, count: 0 };

      try {
        const result = await window.electron.getProjectCount(path);
        // 로딩 완료 및 결과 설정
        this.projectCounts[path] = {
          loading: false,
          count: result.success ? result.count : 0,
        };
      } catch (e) {
        console.error(`프로젝트 수 계산 오류 (${path}):`, e);
        this.projectCounts[path] = {
          loading: false,
          count: 0,
        };
      }
    },

    async applyPaths() {
      try {
        // await window.electron.invoke("set-db", "settings", {
        //   watchPath: this.selectedPaths,
        // });
        this.$store.dispatch("common/setSettings", {
          watchPath: this.selectedPaths,
        });
        this.$q.notify({
          type: "positive",
          message: "설정이 저장되었습니다.",
          position: "top",
        });
      } catch (e) {
        console.error("설정 저장 오류:", e);
        this.$q.notify({
          type: "negative",
          message: "설정 저장 중 오류가 발생했습니다.",
          position: "top",
        });
      }
    },
  },

  async mounted() {
    // try {
    //   // 저장된 경로들 불러오기
    //   const savedPaths = await window.electron.invoke("get-db", "watchPaths");
    //   if (savedPaths) {
    //     this.selectedPaths = savedPaths;
    //   }
    // } catch (e) {
    //   console.error("저장된 경로 불러오기 오류:", e);
    // }
  },
};
</script>

<style lang="scss" scoped>
.q-list {
  max-height: calc(100vh - 250px);
  overflow-y: auto;
}
</style>
