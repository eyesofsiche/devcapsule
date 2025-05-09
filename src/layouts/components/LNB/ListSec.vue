<template lang="pug">
q-scroll-area.scroll#scroll-lbn-area
  template(v-if="listView === 'projects'")
    template(v-if="projects.length > 0")
    template(v-else)
      .text-caption.no-project(v-if="projects?.list.length < 1")
        q-icon(name="info" size="25px" color="white")
        | 등록된 프로젝트가 없습니다.
      template(v-else)
        q-virtual-scroll(
          ref="virtScroll"
          :items="list"
          v-slot="{ item, index }"
          scroll-target="#scroll-lbn-area > .scroll"
        )
          q-item.q-pa-none(:key="index")
            q-item-section
              q-btn.full-width(
                :ref="`btn-${index}`"
                align="left"
                :color="index !== active ? '201F27' : 'blue-grey-9'"
                :flat="index !== active"
                dense
                no-caps
                @click="clickProject(item, index)"
                @keydown.up.prevent="focusPrev(index)"
                @keydown.down.prevent="focusNext(index)"
              )
                q-icon(name="play_for_work" size="20px" color="white")
                span.label {{ item.name }}
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
  watch: {
    $route: {
      handler(to, from) {
        if (to.query.id === undefined) {
          this.active = -1;
          return;
        }
        this.active = this.projects.list.findIndex(
          (item) => item.id === to.query.id
        );
        this.$nextTick(() => {
          this.$refs.virtScroll.scrollTo(this.active);
          setTimeout(() => {
            const btnRef = this.$refs[`btn-${this.active}`];
            if (btnRef && btnRef.$el) {
              btnRef.$el.focus();
            }
          }, 100);
        });
      },
      immediate: true,
    },
    projects: {
      handler() {
        this.list = this.projects.list;
      },
      immediate: true,
    },
  },
  data() {
    return {
      list: [],
      active: -1,
    };
  },
  methods: {
    clickProject(item, index) {
      console.log(JSON.stringify(item, 0, 2));
      this.$router.push({
        name: "project",
        query: {
          id: item.id,
        },
      });
    },
    focusPrev(index) {
      if (index > 0) {
        const item = this.list[index - 1];
        this.$router.push({
          name: "project",
          query: {
            id: item.id,
          },
        });
      }
    },
    focusNext(index) {
      if (index < this.list.length - 1) {
        const item = this.list[index + 1];
        this.$router.push({
          name: "project",
          query: {
            id: item.id,
          },
        });
      }
    },
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
