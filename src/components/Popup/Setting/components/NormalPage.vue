<template lang="pug">
.normal-page
  q-form.q-gutter-md(ref="postForm")
    q-list
      q-item
        q-checkbox(v-model="postForm.autoRun" label="시작시 자동실행" dense)
      q-item
        q-checkbox(v-model="postForm.autoRefresh" :disable="isDisableRefresh" label="5분마다 감시폴더 리플레시 (성능 저하 가능)" dense)

  Teleport(v-if="showActions" to="#right-actions")
    .row.q-gutter-x-sm
      q-btn(
        v-if="isEdit"
        label="취소"
        color="negative"
        dense
        @click="clickCancel"
      )
      q-btn(
        v-if="isEdit"
        label="저장"
        color="primary"
        dense
        @click="clickSave"
      )
      q-btn(
        v-if="!isEdit"
        label="닫기"
        color="grey"
        dense
        @click="$emit('close')"
      )
</template>

<script>
import { mapGetters } from "vuex";

const defaultForm = {
  autoRun: false,
  autoRefresh: false,
  theme: "dark",
  language: "ko",
};

export default {
  name: "NormalPage",
  computed: {
    ...mapGetters(["settings", "folders"]),
    isEdit() {
      return !this.$_.isEqual(this.originForm, this.postForm);
    },
    isDisableRefresh() {
      return this.folders.length < 1;
    },
  },
  watch: {
    settings: {
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
      originForm: this.$_.cloneDeep(defaultForm),
      postForm: this.$_.cloneDeep(defaultForm),
      showActions: false,
    };
  },
  methods: {
    init(val) {
      this.originForm = this.$_.cloneDeep(val);
      this.postForm = this.$_.cloneDeep(val);
    },
    clickCancel() {
      this.init(this.settings);
    },
    clickSave() {
      this.$store.dispatch("settings/setSettings", {
        data: this.postForm,
      });
      this.clickCancel();
    },
  },
};
</script>

<style lang="scss" scoped></style>
