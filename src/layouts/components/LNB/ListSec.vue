<template lang="pug">
q-scroll-area.scroll#scroll-lbn-area
  template(v-if="listView === 'projects'")
    template(v-if="projects.length > 0")
    template(v-else)
      .text-caption.no-project
        q-icon(name="info" size="25px" color="white")
        | 등록된 프로젝트가 없습니다.
  unreg-list(v-else)
</template>

<script>
import { mapGetters } from "vuex";

import UnregList from "./UnregList.vue";
export default {
  name: "LNB",
  components: {
    UnregList,
  },
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
  :deep(.q-scrollarea__content) {
    max-width: 100%;
  }
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
