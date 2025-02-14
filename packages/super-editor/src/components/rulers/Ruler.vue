<script setup>
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue';

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
  pageSize: {
    type: Object,
    default: () => ({ width: 8.5, height: 11 }),
  },
  pageMargins: {
    type: Object,
    default: () => ({ top: 1, right: 1, bottom: 1, left: 1 }),
  },
});

const HANDLE_WIDTH = 5;
const MIN_WIDTH = 200;
const ruler = ref(null);
const rulerDefinition = ref([]);
const alignment = 'flex-end';

const isDragging = ref(false);
const currentHandle = ref(null);
const leftHandle = reactive({ side: 'left', x: 0 });
const rightHandle = reactive({ side: 'right', x: 0 });
const showVerticalIndicator = ref(false);
const initialX = ref(0);
let offsetX = 0;

/**
 * Generate the ruler.
 */
const initRuler = () => {
  const rulerItems = [];
  rightHandle.x = props.pageSize.width * 96 - props.pageMargins.right * 96;
  leftHandle.x = props.pageMargins.left * 96;

  for (let i = 0; i < props.pageSize.width; i++) {
    const marginNum = 0.0625 * 96 - 0.5;
    const margin = `${marginNum}px`;

    const diff = props.pageSize.width - i;
    rulerItems.push(...generateSection(1, 'main', '25%', margin, i));
    rulerItems.push(...generateSection(3, 'eighth', '25%', margin));
    rulerItems.push(...generateSection(1, 'half', '50%', margin));

    if (diff <= 0.5) break;
    rulerItems.push(...generateSection(3, 'eighth', '25%', margin));
  }
  return rulerItems;
};

/**
 * Generate a section of the ruler
 * 
 * @param {Number} qty - Number of elements in the section
 * @param {String} size - Size of the element
 * @param {String} height - Height of the element
 * @param {String} margin - Margin of the element
 * @param {Number} index - Index of the element
 * @returns {Array} - Array of ruler elements
 */
const generateSection = (qty, size, height, margin, index) => {
  return Array.from({ length: qty }, (_, i) => {
    const item = {
      className: `${size}-unit ruler-section`,
      height,
      margin
    };

    if (index !== undefined) item.numbering = index;
    return item;
  });
};


/**
 * Get the style for a ruler element
 * 
 * @param {Object} unit - Ruler element
 * @returns {Object} - Style object
 */
const getStyle = computed(() => (unit) => {
  return {
    width: '1px',
    minWidth: '1px',
    maxWidth: '1px',
    height: unit.height,
    backgroundColor: unit.color || '#333',
    marginLeft: unit.numbering === 0 ? null : unit.margin,
    marginRight: unit.margin,
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
    backgroundColor: '#CCC',
  };
});

/**
 * Get the style for the vertical indicator
 * 
 * @returns {Object} - Style object
 */
const getVerticalIndicatorStyle = computed(() => {
  if (!ruler.value) return;
  const parentElement = ruler.value.parentElement;
  const editor = parentElement.querySelector('.super-editor');
  const editorBounds = editor.getBoundingClientRect();
  return {
    left: `${currentHandle.value.x + 2}px`,
    minHeight : `${editorBounds.height}px`,
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

  // Get the currently selected handle
  const itemId = event.currentTarget.id;
  currentHandle.value = itemId === 'left-margin-handle' ? leftHandle : rightHandle;
  initialX.value = currentHandle.value.x;
  offsetX = event.clientX - currentHandle.value.x;

  showVerticalIndicator.value = true;
};

/**
 * On mouse move, update the position of the margin handle
 * 
 * @param {Event} event - Mouse move event
 * @returns {void}
 */
const handleMouseMove = (event) => {
  if (!isDragging.value) return

  const newLeft = event.clientX - offsetX;
  currentHandle.value.x = newLeft;

  if (currentHandle.value.side === 'left') {
    if (newLeft <= 0) {
      currentHandle.value.x = 0;
    } else if (newLeft >= rightHandle.x - MIN_WIDTH) {
      currentHandle.value.x = rightHandle.x - MIN_WIDTH;
    }
  } else {
    if (newLeft >= props.pageSize.width * 96) {
      currentHandle.value.x = props.pageSize.width * 96;
    } else if (newLeft <= leftHandle.x + MIN_WIDTH) {
      currentHandle.value.x = leftHandle.x + MIN_WIDTH;
    }
  }
};

/**
 * On mouse up, stop dragging the margin handle and emit the new margin value
 * 
 * @returns {void}
 */
const handleMouseUp = () => {
  isDragging.value = false;
  showVerticalIndicator.value = false;

  if (currentHandle.value && currentHandle.value.x !== initialX.value) {
    const marginValue = getNewMarginValue();
    emit('margin-change', {
      side: currentHandle.value.side,
      value: marginValue,
    });
  }
};

/**
 * Get the new margin value based on the current handle position
 * 
 * @returns {Number} - New margin value
 */
const getNewMarginValue = () => {
  if (currentHandle.value.side === 'left') return currentHandle.value.x / 96;
  else return (props.pageSize.width * 96 - currentHandle.value.x) / 96;
};

onMounted(() => {
  rulerDefinition.value = initRuler();
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
});

</script>

<template>
  <div class="ruler" ref="ruler" :style="{ '--alignment': alignment }">

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
  
    <!-- The ruler display -->
    <div v-for="unit in rulerDefinition" :class="unit.className" :style="getStyle(unit)">
      <div class="numbering">{{ unit.numbering }}</div>
      <div v-for="half in unit.elements" :class="half.className" :style="getStyle(half)">
        <div v-for="quarter in half.elements" :class="quarter.className" :style="getStyle(quarter)">
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.vertical-indicator {
  position: absolute;
  height: 0px;
  min-width: 1px;
  background-color: #AAA;
  top: 20px;
  z-index: 100;
}
.margin-handle {
  width: 56px;
  min-width: 5px;
  max-width: 5px;
  background-color: #CCC;
  height: 20px;
  cursor: grab;
  position: absolute;
  margin-left: -2px;
  border-radius: 4px 4px 0 0;
  transition: background-color 250ms ease;
}
.margin-handle:hover {
  background-color: #999;
}
.ruler {
  max-height: 25px;
  height: 25px;
  max-width: 8.5in;
  display: flex;
  margin: 0;
  padding: 0;
  align-items: var(--alignment);
  box-sizing: border-box;
  position: absolute;
  top: -27px;
  color: #333;
}
.mouse-tracker {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 100%;
  background-color: var(--color);
  pointer-events: none;
}
.numbering {
  position: absolute;
  top: -16px;
  left: -3px;
  font-size: 10px;
  pointer-events: none;
  user-select: none;
}
.ruler-section {
  position: relative;
  display: flex;
  align-items: var(--alignment);
  pointer-events: none;
  user-select: none;
}
</style>