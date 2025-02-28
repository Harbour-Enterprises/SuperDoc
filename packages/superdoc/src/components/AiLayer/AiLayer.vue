<script setup>
import { useSuperdocStore } from '@superdoc/stores/superdoc-store';
const superdocStore = useSuperdocStore();

const getStyle = () => {
  const placement = superdocStore.activeSelection.selectionBounds;

  return {
    position: 'absolute',
    top: parseFloat(placement.top) + 'px',
    left: placement.left + 'px',
    width: placement.right - placement.left + 'px',
    height: placement.bottom - placement.top + 'px',
    backgroundColor: '#6366f1' + '33',
    pointerEvents: 'none',
  };
};

const addAiHighlight = () => {
  const layer = document.querySelector('.ai-highlight-layer');
  // Only add if there isn't already a highlight
  if (!layer.hasChildNodes()) {
    const highlightDiv = document.createElement('div');
    highlightDiv.className = 'ai-highlight-anchor sd-highlight';
    Object.assign(highlightDiv.style, getStyle());
    layer.appendChild(highlightDiv);
  }
};

const removeAiHighlight = () => {
  const layer = document.querySelector('.ai-highlight-layer');
  layer.innerHTML = '';
};

defineExpose({
  addAiHighlight,
  removeAiHighlight,
});
</script>

<template>
  <div class="ai-highlight-container" id="aiHighlightContainer">
    <div class="ai-highlight-layer"></div>
  </div>
</template>

<style scoped>
.ai-highlight-layer {
  position: relative;
}
.ai-highlight-anchor {
  position: absolute;
  cursor: pointer;
  z-index: 3;
  border-radius: 4px;
  transition: background-color 250ms ease;
}
.bypass {
  display: none;
}
</style>