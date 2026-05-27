<template>
  <div class="page">
    <slot></slot>
    <ooc-settings :minimal="minimal"></ooc-settings>
  </div>
</template>

<style>
body {
  height: 100vh;
  max-height: 100vh;
  position: relative;
  overflow-y: auto;
}
</style>

<script>
export default {
  props: {
    minimal: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
