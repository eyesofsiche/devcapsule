<template lang="pug">
q-input(
  v-model="value"
  v-bind="mergedAttrs"
)
</template>

<script>
export default {
  name: "FlatInput",
  props: {
    modelValue: {
      type: [String, Number],
      default: "",
    },
  },
  computed: {
    isAttrReadonly() {
      if (this.$attrs.hasOwnProperty("readonly")) {
        return this.$attrs.readonly !== false;
      }
      return undefined;
    },
    mergedAttrs() {
      return {
        ...this.$attrs,
        readonly: this.isAttrReadonly || this.isReadonly,
      };
    },
  },
  watch: {
    modelValue: {
      handler(newVal) {
        this.value = newVal;
      },
      immediate: true,
    },
    value(newVal) {
      this.$emit("update:modelValue", newVal);
    },
  },
  emits: ["update:modelValue"],
  mounted() {
    if (this.notAuto) {
      this.isReadonly = true;
      setTimeout(() => {
        this.isReadonly = false;
      }, 500);
    }
  },
  data() {
    return {
      isReadonly: false,
      value: this.modelValue,
    };
  },
};
</script>

<style lang="scss" scoped>
.q-field {
  :deep(.q-field__inner) {
    .q-field__control {
      &::before {
        border-color: transparent;
      }
    }
    &:hover {
      .q-field__control {
        &::before {
          border-color: rgba(255, 255, 255, 0.6);
        }
      }
    }
  }
}
</style>
