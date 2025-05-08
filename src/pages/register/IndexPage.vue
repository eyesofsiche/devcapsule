<template lang="pug">
q-card.layout
  q-card-section
    q-form.full-width
      .row.items-center
        q-icon.q-mr-sm(
          name="mdi-subtitles-outline"
          size="30px"
          color="white"
        )
        flat-input.text-h6.col(
          v-model="path"
          outlined
        )

      q-list(v-if="info")
        q-item-label(header :style="`width: ${labelWidth};`")
          q-icon.q-mr-sm(name="mdi-pin" size="20px" color="white")
          | 기본정보
        label-value(label="이름" :value="info.name" :width="labelWidth")
        label-value(label="버전" :value="info.version" :width="labelWidth")
        label-value(label="설명" :value="info.description" :width="labelWidth")
        label-value(label="라이센스" :value="info.license" :width="labelWidth")
          //- q-item(clickable dense)
          //-   q-item-section(side style="width: 100px; align-items: flex-end;") name
          //-   q-item-section devcamp
          //- q-item(clickable dense)
          //-   q-item-section(side) sdkjfksdf lskdjflskj dfname
          //-   q-item-section devcamp
        q-item-label(header :style="`width: ${labelWidth};`")
          q-icon.q-mr-sm(name="mdi-git" size="20px" color="white")
          | Git 정보
        label-value(label="브랜치" :value="info.git?.currentBranch" :width="labelWidth")
        label-value(label="remote" :value="info.git?.remotes[0]" :width="labelWidth")
        label-value(label="마지막 커밋" :value="info.git?.lastCommit.message" :width="labelWidth")

        //- q-item-label(header :style="`width: ${labelWidth};`")
          q-icon.q-mr-sm(name="mdi-book-multiple" size="20px" color="white")
          | 의존성

        q-item-label(header :style="`width: ${labelWidth};`")
          q-icon.q-mr-sm(name="mdi-file-document-multiple" size="20px" color="white")
          | 구조

        label-value(label="디렉토리 크기" :value="info.size" :width="labelWidth")
      //- q-item-label.text-h6 {{ path }}
  //- q-separator
  //- q-card-section
  //-   q-btn(
  //-     label="프로젝트 등록"
  //-     color="primary"
  //-     @click="fetchProject(projects.unreg[index])"
  //-   )
  //- q-separator
  //- q-card-section
  //-   q-btn(
  //-     label="프로젝트 삭제"
  //-     color="negative"
  //-     @click="fetchProject(projects.unreg[index])"
  //-   )
  q-card-actions
    q-btn(
      label="취소"
      color="grey-4"
      @click="$router.push({ name: 'home' })"
    )
</template>

<script>
import { mapGetters } from "vuex";

import FlatInput from "@/components/Form/FlatInput.vue";
import LabelValue from "@/components/Form/LabelValue.vue";

export default {
  name: "RegisterPage",
  components: {
    FlatInput,
    LabelValue,
  },
  computed: {
    ...mapGetters(["projects"]),
  },
  watch: {
    $route: {
      handler(to, from) {
        this.path = this.projects.unreg[to.query.index];
        this.fetchProject(this.path);
      },
      immediate: true,
    },
  },
  mounted() {},
  data() {
    return {
      labelWidth: "130px",
      path: null,
      info: null,
    };
  },
  methods: {
    fetchProject(path) {
      window.electron
        .invokeWithReply("cmd:project-info", {
          path,
        })
        .then((result) => {
          console.log(result);
          const { success } = result;
          if (success) {
            this.info = result;
          }
        });
    },
  },
};
</script>

<style lang="scss" scoped>
.title {
  // font-size: 1.1rem;
}
.q-item__label--header {
  text-align: right;
  padding-right: 0;
  border-bottom: 1px solid rgba($color: #eee, $alpha: 0.2);
}
.q-list {
  > .q-item__label {
    margin-top: 20px;
    margin-bottom: 10px;
  }
}
</style>
