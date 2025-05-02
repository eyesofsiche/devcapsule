<template lang="pug">
q-layout(view="lhr LpR lFf" :dark="$q.dark.isActive")
  lnb-page
  q-page-container
    router-view
</template>

<script>
import LnbPage from "./components/LNB/IndexPage.vue";

export default {
  name: "MainLayout",
  components: {
    LnbPage,
  },
};
</script>

<style lang="scss" scoped>
.q-page-container {
  margin-left: 300px;
}
</style>
