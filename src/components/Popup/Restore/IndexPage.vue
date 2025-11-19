<template lang="pug">
q-dialog(
  ref="dialog"
  :model-value="modelValue"
  no-backdrop-dismiss
  backdrop-filter="blur(4px)"
)
  q-card.restore-dialog(style="min-width: 600px; max-width: 700px;")
    //- Header
    q-card-section.dialog-header
      .text-subtitle1.q-ml-sm 프로젝트 복원
      
    q-separator

    //- Content
    q-card-section.dialog-content
      //- 원본 정보
      .info-section.q-mb-lg
        .section-title 원본 정보
        .info-box
          .info-item
            .info-label
              q-icon.q-mr-xs(name="mdi-folder-outline" size="16px")
              | 원본 경로
            .info-value {{ project?.path || '-' }}
          .info-item
            .info-label
              q-icon.q-mr-xs(name="mdi-git" size="16px")
              | Git 저장소
            .info-value {{ gitRepoUrl || '-' }}
      
      //- 복원 위치
      .info-section.q-mb-lg
        .section-title 복원 위치
        .location-selector
          q-input(
            v-model="targetPath"
            outlined
            dense
            readonly
            bg-color="grey-9"
          )
            template(v-slot:prepend)
              q-icon(name="mdi-folder" color="amber")
            template(v-slot:append)
              q-btn(
                icon="mdi-folder-open"
                flat
                dense
                round
                color="primary"
                @click="selectFolder"
              )
                q-tooltip 폴더 선택
      
      //- 복원 방식
      .info-section
        .section-title 복원 방식
        q-option-group(
          v-model="cloneMode"
          :options="cloneModeOptions"
          color="primary"
          class="clone-options"
          dense
        )
          template(v-slot:label="opt")
            .option-label
              .option-title {{ opt.label }}
              .option-desc {{ opt.description }}
      
      //- 최종 경로 미리보기
      .preview-section(v-if="targetPath")
        q-icon.q-mr-xs(name="mdi-arrow-right-bold" size="16px" color="green")
        span.preview-label 복원될 경로:
        span.preview-path {{ finalPath }}

    //- Actions
    q-card-actions(align="right")
      q-btn(
        label="취소"
        flat
        dense
        color="grey"
        @click="close"
      )
      q-btn(
        label="복원"
        unelevated
        dense
        color="primary"
        :disable="!targetPath"
        @click="restore"
      )
        q-tooltip(v-if="!targetPath") 복원 위치를 선택해주세요
</template>

<script>
import { mapGetters } from "vuex";

export default {
  name: "RestorePage",
  components: {},
  props: {
    modelValue: Boolean,
    project: Object,
  },
  computed: {
    ...mapGetters(["settings"]),
    gitRepoUrl() {
      return this.project?.git?.remotes?.[0]?.url || "";
    },
    repoName() {
      if (!this.gitRepoUrl) return "";
      return this.gitRepoUrl
        .split("/")
        .pop()
        .replace(/\.git$/, "");
    },
    originalFolderName() {
      if (!this.project?.path) return "";
      return this.project.path.split(/[/\\]/).pop();
    },
    finalPath() {
      if (!this.targetPath) return "";

      if (this.cloneMode === "current") {
        return this.targetPath;
      } else if (this.cloneMode === "subfolder") {
        return `${this.targetPath}/${this.repoName}`;
      } else {
        // auto
        if (this.originalFolderName === this.repoName) {
          return `${this.targetPath}/${this.repoName}`;
        } else {
          return `${this.targetPath}/${this.originalFolderName}`;
        }
      }
    },
  },
  watch: {
    modelValue: {
      handler(val) {
        if (val) {
          this.init();
        }
      },
      immediate: true,
    },
  },
  data() {
    return {
      cloneMode: "auto",
      targetPath: "",
      cloneModeOptions: [
        {
          label: "자동 판단",
          value: "auto",
          description: "원본 구조를 분석하여 최적의 방식으로 복원합니다",
        },
        {
          label: "현재 폴더에 클론",
          value: "current",
          description: "선택한 폴더에 직접 클론합니다 (git clone url ./)",
        },
        {
          label: "하위 폴더 생성",
          value: "subfolder",
          description: "Git 저장소 이름으로 하위 폴더를 생성합니다",
        },
      ],
    };
  },
  methods: {
    init() {
      // 원본 경로의 부모 디렉토리를 기본값으로 설정
      if (this.project?.path) {
        const parentPath = this.project.path
          .split(/[/\\]/)
          .slice(0, -1)
          .join("/");
        this.targetPath = parentPath;
      }
    },
    async selectFolder() {
      const result = await window.electron.selectFolder(this.targetPath);
      if (result) {
        this.targetPath = result;
      }
    },
    async restore() {
      this.$q.loading.show({ message: "프로젝트 복원 중..." });

      try {
        const result = await window.electron.restoreProject({
          projectId: this.project.id,
          clonePath: this.finalPath,
        });

        if (result.success) {
          this.$q.notify({
            type: "positive",
            message: "프로젝트가 성공적으로 복원되었습니다",
            caption: result.clonePath,
          });
          this.$emit("restored", result);
          this.close();
        } else {
          this.$q.notify({
            type: "negative",
            message: "프로젝트 복원에 실패했습니다",
            caption: result.error,
          });
        }
      } catch (err) {
        this.$q.notify({
          type: "negative",
          message: "프로젝트 복원 중 오류가 발생했습니다",
          caption: err.message,
        });
      } finally {
        this.$q.loading.hide();
      }
    },
    close() {
      this.$emit("update:modelValue", false);
    },
  },
};
</script>

<style lang="scss" scoped>
.restore-dialog {
  background: #1e1e1e;

  .dialog-header {
    padding: 15px 24px;
    background: linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%);
    border-bottom: 1px solid #3a3a3a;
  }

  .dialog-content {
    padding: 24px;
    background-color: #282828;
  }

  .info-section {
    .section-title {
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 600;
      color: #e0e0e0;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #3a3a3a;
    }
  }

  .info-box {
    background: #2a2a2a;
    border-radius: 8px;
    padding: 16px;
    border: 1px solid #3a3a3a;

    .info-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      .info-label {
        display: flex;
        align-items: center;
        min-width: 120px;
        font-size: 13px;
        color: #9e9e9e;
        font-weight: 500;
      }

      .info-value {
        flex: 1;
        font-size: 13px;
        color: #e0e0e0;
        word-break: break-all;
        font-family: "Monaco", "Menlo", monospace;
        background: #1a1a1a;
        padding: 6px 12px;
        border-radius: 4px;
        border: 1px solid #333;
      }
    }
  }

  .location-selector {
    :deep(.q-field__control) {
      border-radius: 8px;
    }
  }

  .clone-options {
    :deep(.q-radio) {
      width: 100%;
      margin-bottom: 16px;
      padding: 12px 15px;
      background: #2a2a2a;
      border-radius: 8px;
      border: 2px solid #3a3a3a;
      transition: all 0.2s;

      &:hover {
        background: #303030;
        border-color: #4a4a4a;
      }

      .q-radio__label {
        width: 100%;
        padding-left: 15px;
      }
    }

    :deep(.q-radio--truthy) {
      background: #1a3a4a;
      border-color: $primary;
    }
  }

  .option-label {
    width: 100%;

    .option-title {
      font-size: 14px;
      font-weight: 600;
      color: #e0e0e0;
      margin-bottom: 4px;
    }

    .option-desc {
      font-size: 12px;
      color: #9e9e9e;
      line-height: 1.4;
    }
  }

  .preview-section {
    margin-top: 24px;
    padding: 16px;
    background: #1a2a1a;
    border: 2px solid #2d5a2d;
    border-radius: 8px;
    display: flex;
    align-items: center;

    .preview-label {
      font-size: 13px;
      font-weight: 600;
      color: #81c784;
      margin-right: 8px;
    }

    .preview-path {
      font-size: 13px;
      color: #a5d6a7;
      font-family: "Monaco", "Menlo", monospace;
      word-break: break-all;
    }
  }

  .dialog-actions {
    padding: 16px 24px;
    background: #2a2a2a;
    border-top: 1px solid #3a3a3a;
  }
}
</style>
