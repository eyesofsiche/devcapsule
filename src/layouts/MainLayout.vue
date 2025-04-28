<template lang="pug">
q-layout(view="lhr LpR lFf" :dark="$q.dark.isActive")
  .sidebar
    q-list.full-width
      q-item(v-ripple)
        q-item-section
          q-btn.full-width.hover(
            icon="grid_view"
            align="left"
            color="201F27"
            flat
            dense
          ) 미등록 프로젝트
            q-badge(label="!" color="red" floating transparent rounded)
      q-separator
      q-scroll-area.scroll
      q-separator
      q-item(v-ripple)
        q-item-section
          q-btn.full-width(
            icon="settings"
            align="left"
            color="201F27"
            flat
            dense
          ) 설정
  q-page-container
    router-view
</template>

<script>
import { defineComponent } from "vue";

import EssentialLink from "components/EssentialLink.vue";

const linksList = [
  {
    title: "Docs",
    caption: "quasar.dev",
    icon: "school",
    link: "https://quasar.dev",
  },
  {
    title: "Github",
    caption: "github.com/quasarframework",
    icon: "code",
    link: "https://github.com/quasarframework",
  },
  {
    title: "Discord Chat Channel",
    caption: "chat.quasar.dev",
    icon: "chat",
    link: "https://chat.quasar.dev",
  },
  {
    title: "Forum",
    caption: "forum.quasar.dev",
    icon: "record_voice_over",
    link: "https://forum.quasar.dev",
  },
  {
    title: "Twitter",
    caption: "@quasarframework",
    icon: "rss_feed",
    link: "https://twitter.quasar.dev",
  },
  {
    title: "Facebook",
    caption: "@QuasarFramework",
    icon: "public",
    link: "https://facebook.quasar.dev",
  },
  {
    title: "Quasar Awesome",
    caption: "Community Quasar projects",
    icon: "favorite",
    link: "https://awesome.quasar.dev",
  },
];

export default defineComponent({
  name: "MainLayout",

  components: {
    EssentialLink,
  },
});
</script>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  width: 300px;
  height: 100vh;
  border-right: 1px solid #2e2e2f;
  background-color: #2d2d2d;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1;

  .q-item {
    padding: 8px;
  }

  .q-btn.hover {
    // background-color: #201f27;
  }
}

.q-page-container {
  margin-left: 300px;
}

.scroll {
  height: calc(100vh - 102px);
}
</style>
