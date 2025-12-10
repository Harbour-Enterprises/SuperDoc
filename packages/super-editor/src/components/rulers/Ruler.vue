<script setup>
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue';
import { generateRulerDefinition, clampHandlePosition, calculateMarginFromHandle } from '@superdoc/painter-dom';

const emit = defineEmits(['margin-change']);
const props = defineProps({
  orientation: {
    type: String,
    default: 'horizontal',
  },
  length: {
    type: Number,
    default: 0,
  },
  editor: {
    type: Object,
    required: true,
  },
});

const MIN_WIDTH = 200;
const PPI = 96;
const ruler = ref(null);
const rulerDefinition = ref(null);
const alignment = 'flex-end';

const rulerHandleOriginalColor = ref('#CCCCCC');
const rulerHandleActiveColor = ref('#2563EB66');
const pageSize = ref(null);
const pageMargins = ref(null);

const isDragging = ref(false);
const currentHandle = ref(null);
const leftHandle = reactive({ side: 'left', x: 0 });
const rightHandle = reactive({ side: 'right', x: 0 });
const showVerticalIndicator = ref(false);
const initialX = ref(0);
let offsetX = 0;

/**
 * Initialize the ruler using shared ruler-core logic.
 */
const initRuler = () => {
  if (props.editor.options.mode !== 'docx') return null;

  const { pageMargins: docMargins, pageSize: docSize } = props.editor.getPageStyles();
  pageSize.value = docSize;
  pageMargins.value = docMargins;

  // Generate ruler definition using shared core logic
  const definition = generateRulerDefinition({
    pageSize: { width: docSize.width, height: docSize.height },
    pageMargins: {
      left: docMargins.left,
      right: docMargins.right,
      top: docMargins.top ?? 1,
      bottom: docMargins.bottom ?? 1,
    },
  });

  // Set handle positions from the definition
  leftHandle.x = definition.leftMarginPx;
  rightHandle.x = definition.rightMarginPx;

  return definition;
};

/**
 * Get the style for a ruler tick element.
 * Uses the new RulerTick format from ruler-core.
 *
 * @param {Object} tick - Ruler tick from rulerDefinition.ticks
 * @returns {Object} - Style object
 */
const getTickStyle = computed(() => (tick) => {
  return {
    position: 'absolute',
    left: `${tick.x}px`,
    bottom: '0',
    width: '1px',
    height: tick.height,
    backgroundColor: '#666',
    pointerEvents: 'none',
  };
});

/**
 * Get the position of the margin handles
 *
 * @param {String} side - Side of the margin handle
 * @returns {Object} - Style object
 */
const getHandlePosition = computed(() => (side) => {
  const handle = side === 'left' ? leftHandle : rightHandle;
  return {
    left: `${handle.x}px`,
  };
});

/**
 * Get the style for the vertical indicator
 *
 * @returns {Object} - Style object
 */
const getVerticalIndicatorStyle = computed(() => {
  if (!ruler.value) return;
  // Try to find .super-editor in parent (normal case) or fall back to document query
  // (for teleported rulers in external containers)
  const parentElement = ruler.value.parentElement;
  const editor = parentElement?.querySelector('.super-editor') ?? document.querySelector('.super-editor');
  if (!editor) return { left: `${currentHandle.value.x}px`, minHeight: '100%' };
  const editorBounds = editor.getBoundingClientRect();
  return {
    left: `${currentHandle.value.x}px`,
    minHeight: `${editorBounds.height}px`,
  };
});

/**
 * On mouse down, prepare to drag a margin handle and show the vertical indicator
 *
 * @param {Event} event - Mouse down event
 * @returns {void}
 */
const handleMouseDown = (event) => {
  isDragging.value = true;

  setRulerHandleActive();

  // Get the currently selected handle
  const itemId = event.currentTarget.id;
  currentHandle.value = itemId === 'left-margin-handle' ? leftHandle : rightHandle;
  initialX.value = currentHandle.value.x;
  offsetX = event.clientX - currentHandle.value.x;

  showVerticalIndicator.value = true;
};

/**
 * On mouse move, update the position of the margin handle.
 * Uses shared clampHandlePosition from ruler-core.
 *
 * @param {Event} event - Mouse move event
 * @returns {void}
 */
const handleMouseMove = (event) => {
  if (!isDragging.value || !pageSize.value) return;

  const newLeft = event.clientX - offsetX;
  const pageWidthPx = pageSize.value.width * PPI;
  const otherHandleX = currentHandle.value.side === 'left' ? rightHandle.x : leftHandle.x;

  // Use shared clampHandlePosition for consistent bounds checking
  currentHandle.value.x = clampHandlePosition(newLeft, currentHandle.value.side, otherHandleX, pageWidthPx, MIN_WIDTH);
};

/**
 * On mouse up, stop dragging the margin handle and emit the new margin value
 *
 * @returns {void}
 */
const handleMouseUp = () => {
  isDragging.value = false;
  showVerticalIndicator.value = false;

  setRulerHandleInactive();

  if (currentHandle.value && currentHandle.value.x !== initialX.value) {
    const marginValue = getNewMarginValue();
    emit('margin-change', {
      side: currentHandle.value.side,
      value: marginValue,
    });
  }
};

/**
 * Set the ruler handle color to active
 *
 * @returns {void}
 */
const setRulerHandleActive = () => {
  rulerHandleOriginalColor.value = rulerHandleActiveColor.value;
};

/**
 * Set the ruler handle color to inactive
 *
 * @returns {void}
 */
const setRulerHandleInactive = () => {
  rulerHandleOriginalColor.value = '#CCC';
};

/**
 * Get the new margin value based on the current handle position.
 * Uses shared calculateMarginFromHandle from ruler-core.
 *
 * @returns {Number} - New margin value in inches
 */
const getNewMarginValue = () => {
  if (!pageSize.value) return 0;
  const pageWidthPx = pageSize.value.width * PPI;
  return calculateMarginFromHandle(currentHandle.value.x, currentHandle.value.side, pageWidthPx, PPI);
};

/**
 * Set ruler style variables including dynamic width from definition
 *
 * @returns {Object} - Style object
 */
const getStyleVars = computed(() => {
  const width = rulerDefinition.value?.widthPx ?? pageSize.value?.width * PPI ?? 816;
  return {
    '--alignment': alignment,
    '--ruler-handle-color': rulerHandleOriginalColor.value,
    '--ruler-handle-active-color': rulerHandleActiveColor.value,
    '--ruler-width': `${width}px`,
  };
});

onMounted(() => {
  rulerDefinition.value = initRuler();
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
  <div class="ruler" ref="ruler" :style="getStyleVars">
    <!-- Margin handles -->
    <div
      class="margin-handle handle-left"
      id="left-margin-handle"
      @mousedown="handleMouseDown"
      :style="getHandlePosition('left')"
    ></div>
    <div
      class="margin-handle handle-right"
      id="right-margin-handle"
      @mousedown="handleMouseDown"
      :style="getHandlePosition('right')"
    ></div>
    <!-- Margin handles end -->

    <div v-if="showVerticalIndicator" class="vertical-indicator" :style="getVerticalIndicatorStyle"></div>

    <!-- The ruler display - using shared ruler-core tick format -->
    <template v-if="rulerDefinition">
      <div
        v-for="(tick, index) in rulerDefinition.ticks"
        :key="index"
        :class="['ruler-tick', `ruler-tick--${tick.size}`]"
        :style="getTickStyle(tick)"
      >
        <span v-if="tick.label !== undefined" class="numbering">{{ tick.label }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.vertical-indicator {
  position: absolute;
  height: 0px;
  min-width: 1px;
  background-color: #aaa;
  top: 20px;
  z-index: 100;
}

.margin-handle {
  width: 56px;
  min-width: 5px;
  max-width: 5px;
  background-color: var(--ruler-handle-color);
  height: 20px;
  cursor: grab;
  position: absolute;
  margin-left: -2px;
  border-radius: 4px 4px 0 0;
  transition: background-color 250ms ease;
  z-index: 10;
}

.margin-handle:hover {
  background-color: var(--ruler-handle-active-color);
}

.ruler {
  height: 25px;
  width: var(--ruler-width, 8.5in);
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  position: relative;
  color: #666;
}

/* Tick marks - using absolute positioning from ruler-core */
.ruler-tick {
  pointer-events: none;
  user-select: none;
}

.numbering {
  position: absolute;
  top: -16px;
  left: -2px;
  font-size: 10px;
  pointer-events: none;
  user-select: none;
}
</style>
