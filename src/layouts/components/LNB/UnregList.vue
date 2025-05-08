<template lang="pug">
.text-caption.no-project(v-if="projects?.unreg.length < 1")
  q-icon(name="info" size="25px" color="white")
  | 프로젝트가 존재하지 않습니다.
template(v-else)
  q-virtual-scroll(
    :items="list"
    v-slot="{ item, index }"
    scroll-target="#scroll-lbn-area > .scroll"
  )
    q-item.q-pa-none(:key="index")
      q-item-section
        q-btn.full-width(
          align="left"
          color="201F27"
          flat
          dense
          no-caps
          @click="clickProject(item, index)"
        )
          q-icon(name="play_for_work" size="20px" color="white")
          span.label {{ item }}
</template>

<script>
import { mapGetters } from "vuex";

export default {
  name: "UnRegisteredList",
  computed: {
    ...mapGetters(["projects"]),
  },
  watch: {
    projects: {
      handler() {
        this.list = this.projects.unreg;
      },
      immediate: true,
    },
  },
  data() {
    return {
      list: [],
    };
  },
  methods: {
    clickProject(item, index) {
      this.$router.push({
        name: "register",
        query: {
          index,
        },
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.q-item.q-pa-none {
  padding: 0 8px;
  :deep(.q-btn) {
    .q-btn__content {
      white-space: nowrap;
    }
    .label {
      direction: rtl;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: calc(100% - 30px);
      display: block;
      // max-width: 100%;
      // display: block;
    }
  }
}
</style>
