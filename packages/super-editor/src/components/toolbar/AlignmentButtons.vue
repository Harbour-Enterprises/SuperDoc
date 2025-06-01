<script setup>
import { toolbarIcons } from './toolbarIcons.js';

const emit = defineEmits(['select']);

const select = (alignment) => {
  emit('select', alignment);
};
</script>

<template>
  <div class="alignment-buttons">
    <div
      class="button-icon"
      @click="select('left')"
      v-html="toolbarIcons.alignLeft"
      data-item="btn-textAlign-option"
    ></div>
    <div
      class="button-icon"
      @click="select('center')"
      v-html="toolbarIcons.alignCenter"
      data-item="btn-textAlign-option"
    ></div>
    <div
      class="button-icon"
      @click="select('right')"
      v-html="toolbarIcons.alignRight"
      data-item="btn-textAlign-option"
    ></div>
    <div
      class="button-icon"
      @click="select('justify')"
      v-html="toolbarIcons.alignJustify"
      data-item="btn-textAlign-option"
    ></div>
  </div>
</template>

<style scoped>
.alignment-buttons {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}
.button-icon {
  cursor: pointer;
  padding: 5px;
  font-size: 16px;
  width: 25px;
  height: 25px;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
}
.button-icon:hover {
  background-color: #d8dee5;
}

.button-icon :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  fill: currentColor;
}
</style>
