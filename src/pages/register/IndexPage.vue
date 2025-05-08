<template lang="pug">
div register {{ this.$route.query.index }}
</template>

<script>
export default {
  name: "RegisterPage",
  watch: {
    $route(to, from) {
      this.index = to.query.index;
    },
  },
  mounted() {
    console.log(this.$route.query.index);
    window.electron
      .invokeWithReply("cmd:project-info", {
        path: "/Users/siche/Documents/devCapsule/v1",
      })
      .then((result) => {
        console.log(result);
      });
  },
  data() {
    return {
      index: this.$route.query.index,
    };
  },
};
</script>

<style lang="scss" scoped></style>
