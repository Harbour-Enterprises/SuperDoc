<script setup>
const emit = defineEmits(['select']);
const props = defineProps({
  options: {
    type: Array,
  },
});

const handleClick = (item) => {
  emit('select', item);
};
</script>

<template>
  <div class="document-mode">
    <div
      class="option-item"
      v-for="option in options"
      @click="handleClick(option)"
      :class="{ disabled: option.disabled }"
      data-item="btn-documentMode-option"
    >
      <div class="document-mode-column icon-column">
        <div class="icon-column__icon" v-html="option.icon"></div>
      </div>

      <div class="document-mode-column text-column">
        <div class="document-mode-type">
          {{ option.label }}
        </div>
        <div class="document-mode-description">
          {{ option.description }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-mode :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  fill: currentColor;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed !important;
  pointer-events: none;
}
.document-mode {
  display: flex;
  flex-direction: column;
  padding: 10px;
  box-sizing: border-box;
}
.option-item {
  display: flex;
  flex-direction: row;
  background-color: white;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  box-sizing: border-box;
}
.document-mode-column {
  display: flex;
  flex-direction: column;
}
.document-mode-type {
  font-weight: 400;
  font-size: 15px;
  color: #222;
}

.icon-column {
  margin-right: 5px;
  justify-content: flex-start;
  align-items: center;
  padding: 0 5px;
  color: black;
  height: 100%;
  box-sizing: border-box;
}

.icon-column__icon {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  height: 18px;
  color: #47484a;
}

.icon-column__icon :deep(svg) {
  width: auto; /* needed for safari */
  max-height: 18px;
}

.document-mode-description {
  font-size: 12px;
  color: #666;
}
.option-item:hover {
  background-color: #c8d0d8;
}
</style>
