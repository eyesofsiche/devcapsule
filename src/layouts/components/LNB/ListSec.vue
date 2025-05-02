<template lang="pug">
q-scroll-area.scroll
  template(v-if="listView === 'projects'")
    template(v-if="projects.length > 0")
    template(v-else)
      .text-caption.no-project
        q-icon(name="info" size="25px" color="white")
        | 등록된 프로젝트가 없습니다.
  template(v-else)
    .text-caption.no-project
      q-icon(name="info" size="25px" color="white")
      | 프로젝트가 존재하지 않습니다.
  //- q-item(v-ripple)
    q-item-section
      q-btn.full-width(
        icon="grid_view"
        align="left"
        color="201F27"
        flat
        dense
      ) project
</template>

<script>
import { mapGetters } from "vuex";
export default {
  name: "LNB",
  props: {
    listView: {
      type: String,
      default: "projects",
    },
  },
  computed: {
    ...mapGetters(["folders", "projects"]),
  },
};
</script>

<style lang="scss" scoped>
.scroll {
  height: calc(100vh - 102px);
}
.no-project {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  i {
    display: block;
    margin: 0 auto 10px;
  }
}
</style>
