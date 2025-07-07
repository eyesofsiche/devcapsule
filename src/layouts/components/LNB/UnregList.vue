<template lang="pug">
.text-caption.no-project(v-if="projects?.unreg.length < 1")
  q-icon(name="info" size="25px" color="white")
  | 프로젝트가 존재하지 않습니다.
q-virtual-scroll(
  v-else
  ref="virtScroll"
  :items="list"
  scroll-target="#scroll-lbn-area > .scroll"
)
  template(v-slot:before)
    .sticky
      q-item.q-pa-none
        q-item-section
          q-input(v-model="keyword" dense)
            template(v-slot:append)
              q-icon(v-if="keyword !== ''" name="close" @click="keyword = ''" class="cursor-pointer")
              q-icon(v-else name="search")
  template(v-slot="{ item, index }")
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
          q-icon(name="mdi-folder-open-outline" size="20px" color="white")
          span.label {{ item }}
</template>

<script>
import { mapGetters } from "vuex";

export default {
  name: "UnRegisteredList",
  computed: {
    ...mapGetters(["projects"]),
    list() {
      if (this.keyword) {
        return this.projects.unreg.filter((item) =>
          item.toLowerCase().includes(this.keyword.toLowerCase())
        );
      }
      return this.projects.unreg;
    },
  },
  watch: {
    $route: {
      handler(to, from) {
        if (to.query.index) {
          this.active = parseInt(to.query.index);
          this.$nextTick(() => {
            this.$refs.virtScroll.scrollTo(this.active);
            setTimeout(() => {
              const btnRef = this.$refs[`btn-${this.active}`];
              if (btnRef && btnRef.$el) {
                btnRef.$el.focus();
              }
            }, 100);
          });
        }
      },
      immediate: true,
    },
  },
  data() {
    return {
      active: null,
      keyword: "",
    };
  },
  methods: {
    clickProject(item, index) {
      this.$router.push({
        name: "register",
        query: {
          index,
          path: item,
        },
      });
    },
    focusPrev(index) {
      if (index > 0) {
        this.$router.push({
          name: "register",
          query: {
            index: index - 1,
            path: this.list[index - 1],
          },
        });
      }
    },
    focusNext(index) {
      if (index < this.list.length - 1) {
        this.$router.push({
          name: "register",
          query: {
            index: index + 1,
            path: this.list[index + 1],
          },
        });
      }
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
.sticky {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: #2d2d2d;
}
</style>
