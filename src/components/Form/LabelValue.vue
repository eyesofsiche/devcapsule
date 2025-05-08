<template lang="pug">
q-item(clickable dense)
  q-item-section(side :style="`width: ${width}; align-items: flex-end;`") {{ label }}
  q-item-section {{ value || '-' }}
</template>

<script>
export default {
  name: "LabelValue",
  props: {
    label: {
      type: String,
      default: "",
    },
    value: {
      type: [String, Number],
      default: "",
    },
    width: {
      type: String,
      default: "auto",
    },
  },
};
</script>

<style lang="scss" scoped></style>
