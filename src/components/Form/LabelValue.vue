<template lang="pug">
q-item(v-if="value !== null" clickable dense)
  template(v-if="!value && value !== null")
    q-skeleton.q-mr-sm(type="text" :style="`width: ${width};`")
    q-skeleton(type="text" :style="`width: ${randomWidth};`")
  template(v-else-if="value !== null")
    template(v-if="typeof value === 'object' && value.length > 0")
      q-item-section(side :style="`width: ${width}; align-items: flex-end;`") {{ label }}
      q-item-section
        .column
          div(v-for="(item, index) in value" :key="index") {{ item }}
    template(v-else)
      q-item-section(side :style="`width: ${width}; align-items: flex-end;`") {{ label }}
      q-item-section {{ value || '-' }} {{ typeof value }}
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
      type: [String, Number, Array],
      default: "",
    },
    width: {
      type: String,
      default: "auto",
    },
  },
  computed: {
    randomWidth() {
      return Math.floor(Math.random() * 100) + 200 + "px";
    },
  },
  watch: {
    value(newValue) {
      // console.log(newValue);
    },
  },
};
</script>

<style lang="scss" scoped></style>
