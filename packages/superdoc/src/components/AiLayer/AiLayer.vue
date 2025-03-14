<script setup>
import { useSuperdocStore } from '@superdoc/stores/superdoc-store';

const props = defineProps({
  editor: {
    type: Object,
    required: false,
    default: null
  }
});

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
  // Add the AI mark using the editor if available
  if (props.editor && !props.editor.isDestroyed) {
    props.editor.commands.insertAiMark();
  } else {
    // Fallback to DOM method if editor is not available
    const layer = document.querySelector('.ai-highlight-layer');
    // Only add if there isn't already a highlight
    if (!layer.hasChildNodes()) {
      const highlightDiv = document.createElement('div');
      highlightDiv.className = 'ai-highlight-anchor sd-highlight';
      Object.assign(highlightDiv.style, getStyle());
      layer.appendChild(highlightDiv);
    }
  }
};

const removeAiHighlight = () => {
  // Remove the AI mark using the editor if available
  if (props.editor && !props.editor.isDestroyed) {
    props.editor.commands.removeAiMark();
  } 
  
  // Always clear the DOM layer as a safety measure
  const layer = document.querySelector('.ai-highlight-layer');
  if (layer) {
    layer.innerHTML = '';
  }
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

<style>
/* Global style for the prosemirror AI highlight */
.ai-highlight {
  background-color: rgba(99, 102, 241, 0.2);
  border-radius: 4px;
  transition: background-color 250ms ease;
  cursor: pointer;
}
</style>

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