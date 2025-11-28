<template lang="pug">
.col(v-if="type === 'connect'")
  q-btn(
    icon="mdi-apple-finder"
    color="blue-grey-4"
    round
    dense
    @click="clickOpenFinder"
    :disable="isLoadingFinder"
  )
  q-btn(
    icon="mdi-console-line"
    color="grey-8"
    round
    dense
    @click="clickOpenTerminal"
    :disable="isLoadingTerminal"
  )
  q-btn(
    icon="mdi-microsoft-visual-studio-code"
    color="primary"
    round
    dense
    @click="clickOpenVSCode"
    :disable="isLoadingVSCode"
  )
</template>

<script>
export default {
  name: "ProjectBtn",
  props: {
    info: {
      type: Object,
      required: true,
    },
    type: {
      type: String,
      enum: ["connect", "watch"],
      default: "connect",
    },
  },
  data() {
    return {
      isLoadingFinder: false,
      isLoadingVSCode: false,
      isLoadingTerminal: false,
    };
  },
  methods: {
    async clickOpenFinder() {
      this.isLoadingFinder = true;
      window.electron
        .openFolder(this.info.path)
        .then((res) => {
          if (!res.success) {
            this.$q.notify({
              type: "negative",
              message: "폴더 열기에 실패했습니다",
            });
          }
        })
        .finally(() => {
          this.isLoadingFinder = false;
        });
    },
    async clickOpenVSCode() {
      this.isLoadingVSCode = true;
      window.electron
        .openVSCode(this.info.path)
        .then((res) => {
          if (!res.success) {
            this.$q.notify({
              type: "negative",
              message: res.error || "VSCode 열기에 실패했습니다",
            });
          }
        })
        .finally(() => {
          this.isLoadingVSCode = false;
        });
    },
    async clickOpenTerminal() {
      this.isLoadingTerminal = true;
      window.electron
        .openTerminal(this.info.path)
        .then((res) => {
          if (!res.success) {
            this.$q.notify({
              type: "negative",
              message: "터미널 열기에 실패했습니다",
            });
          }
        })
        .finally(() => {
          this.isLoadingTerminal = false;
        });
    },
  },
};
</script>

<style lang="scss" scoped></style>
