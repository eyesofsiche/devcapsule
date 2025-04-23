<template lang="pug">
q-page.q-pa-md.column(style="height: 100vh")
  //- 설명 배너
  q-banner.bg-grey-2.text-grey-9.q-mb-md(dense)
    | Dev Capsule은 지정한 상위 폴더들 아래에 있는 프로젝트들의
    code .env
    | 파일을 자동으로 감시하고 백업합니다.
    br
    | 작업 중인 프로젝트들이 모여 있는 상위 폴더들을 선택해주세요.
    br
    | 프로젝트의 기준은 .env 파일이 있는 폴더입니다.
</template>

<script>
export default {};
</script>

<style lang="scss" scoped></style>
