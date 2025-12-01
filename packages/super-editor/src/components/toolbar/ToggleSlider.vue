<script setup lang="ts">
/**
 * Toolbar item structure
 */
interface ToolbarItem {
  name?: string;
  command?: string;
  active?: boolean;
  [key: string]: unknown;
}

interface Props {
  item: ToolbarItem;
  name: string;
  command: string;
  active: boolean;
}

defineEmits<{
  toggle: [];
  select: [];
}>();

defineProps<Props>();
</script>

<template>
  <div class="toggle-ctn">
    <div :class="{ 'toggle-slider': true, on: active }"></div>

    <div class="toggle-background-ctn">
      <div class="left"></div>
      <div class="right"></div>
      <div class="center"></div>
    </div>
  </div>
</template>

<style scoped>
/* toggle */
.toggle-ctn {
  width: 40px;
  height: 20px;
  position: relative;
}
.toggle-slider {
  position: absolute;
  background-color: #555555;
  height: 15px;
  width: 15px;
  z-index: 1;
  border-radius: 60%;
  transform: translateY(-50%);
  top: 50%;
  left: 4px;
}
.toggle-slider.on {
  left: 22px;
}
.toggle-background {
  display: flex;
  position: absolute;
  width: 100%;
  height: 100%;
}

.toggle-background-ctn {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
}

.center {
  background-color: #dbdbdb;
  position: absolute;
  left: 50%;
  width: 50%;
  height: 100%;
  transform: translateX(-50%);
}
</style>
