<script setup>
import { computed } from 'vue';
import { toolbarIcons } from './toolbarIcons.js';
import { generateLinkedStyleString, getQuickFormatList } from '@extensions/linked-styles/index.js';

const emit = defineEmits(['select']);
const props = defineProps({
  editor: {
    type: Object,
    required: true,
  },
});

const select = (style) => {
  emit('select', style);
};
</script>

<template>
  <div class="linked-style-buttons" v-if="props.editor">
    <div v-for="style in getQuickFormatList(editor)" class="style-item" @click="select(style)">
      <div
        class="style-name"
        :style="generateLinkedStyleString(style, null, false)"
        data-item="btn-linkedStyles-option"
      >
        {{ style.definition.attrs.name }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.style-name {
  padding: 16px 10px;
}
.style-name:hover {
  background-color: #c8d0d8;
}
.linked-style-buttons {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  max-height: 400px;
  width: 200px;
  padding: 0;
  margin: 0;
  overflow: auto;
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
