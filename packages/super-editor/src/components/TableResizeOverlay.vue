<template>
  <div v-if="visible && tableMetadata" class="superdoc-table-resize-overlay" :style="overlayStyle" @mousedown.stop>
    <!-- Resize handles for each column boundary segment -->
    <template v-for="(boundary, boundaryIndex) in resizableBoundaries" :key="`boundary-${boundaryIndex}`">
      <div
        v-for="(segment, segmentIndex) in getBoundarySegments(boundary)"
        :key="`handle-${boundary.type}-${boundary.index}-${segmentIndex}`"
        class="resize-handle"
        :class="{
          'resize-handle--active': dragState && dragState.boundaryIndex === boundaryIndex,
          'resize-handle--edge': boundary.type === 'right-edge',
        }"
        :data-boundary-index="boundaryIndex"
        :data-boundary-type="boundary.type"
        :style="getSegmentHandleStyle(boundary, segment)"
        @mousedown="onHandleMouseDown($event, boundaryIndex)"
      ></div>
    </template>

    <!-- Visual guideline during drag -->
    <div v-if="dragState" class="resize-guideline" :style="guidelineStyle"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { pixelsToTwips, twipsToPixels } from '@core/super-converter/helpers.js';
import { measureCache } from '@superdoc/layout-bridge';

/**
 * Props for the TableResizeOverlay component
 */
const props = defineProps({
  /** Editor instance for dispatching transactions */
  editor: {
    type: Object,
    required: true,
  },
  /** Show or hide the overlay */
  visible: {
    type: Boolean,
    default: false,
  },
  /** Table fragment element containing data-table-boundaries */
  tableElement: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['resize-start', 'resize-move', 'resize-end', 'resize-success', 'resize-error']);

/**
 * Parsed table metadata from data-table-boundaries attribute
 * @type {import('vue').Ref<{columns: Array<{i: number, x: number, w: number, min: number, r?: number}>} | null>}
 */
const tableMetadata = ref(null);

/**
 * Drag state tracking
 * @type {import('vue').Ref<{
 *   columnIndex: number,
 *   initialX: number,
 *   initialWidths: number[],
 *   leftColumn: {width: number, minWidth: number},
 *   rightColumn: {width: number, minWidth: number},
 *   constrainedDelta: number
 * } | null>}
 */
const dragState = ref(null);

/**
 * Flag to track forced cleanup (overlay hidden during drag)
 */
const forcedCleanup = ref(false);

/**
 * Overlay position and size relative to table element
 */
const overlayStyle = computed(() => {
  if (!props.tableElement) return {};

  // Use offsetLeft/offsetTop for position within the parent container
  // This avoids issues with viewport coordinates from getBoundingClientRect
  const rect = props.tableElement.getBoundingClientRect();

  // During any drag operation, use a very large overlay to ensure smooth mouse tracking
  // This prevents issues when the mouse moves beyond the original table bounds
  let overlayWidth = rect.width;
  if (dragState.value) {
    // Set a fixed large width during drag to avoid reactive resize triggering re-renders
    overlayWidth = Math.max(rect.width + 1000, 2000);
  }

  return {
    position: 'absolute',
    left: `${props.tableElement.offsetLeft}px`,
    top: `${props.tableElement.offsetTop}px`,
    width: `${overlayWidth}px`,
    height: `${rect.height}px`,
    pointerEvents: dragState.value ? 'auto' : 'none',
    zIndex: 10,
  };
});

/**
 * Filter to only resizable column boundaries
 * Creates handles for:
 * - Inner boundaries (between columns)
 * - Right edge (resize last column)
 */
const resizableBoundaries = computed(() => {
  if (!tableMetadata.value?.columns) {
    return [];
  }

  const columns = tableMetadata.value.columns;
  const boundaries = [];

  // Create handles for inner column boundaries (between columns)
  for (let i = 0; i < columns.length - 1; i++) {
    const col = columns[i];
    const nextCol = columns[i + 1];

    boundaries.push({
      ...col,
      index: i,
      x: nextCol.x,
      type: 'inner',
    });
  }

  // Add handle for right edge of table (resize last column)
  const lastCol = columns[columns.length - 1];
  boundaries.push({
    ...lastCol,
    index: columns.length - 1,
    x: lastCol.x + lastCol.w,
    type: 'right-edge',
  });

  return boundaries;
});

/**
 * Retrieves vertical segments for a column boundary where resize handles should appear.
 *
 * Segments define the vertical ranges where a column boundary is visible and resizable,
 * accounting for merged cells that span multiple rows. A boundary at column index N
 * exists only where cells end at that column position.
 *
 * **Segment Structure:**
 * Each segment has:
 * - `y`: Vertical position in pixels from table top
 * - `h`: Height in pixels, or `null` for full-height (100%)
 *
 * **Right Edge Handling:**
 * Right-edge boundaries always span full height since they represent the table's
 * outer edge.
 *
 * **Merged Cell Handling:**
 * When cells span multiple columns, some boundaries don't exist at certain rows.
 * For example, if row 0 has a cell spanning columns 0-2, there's no boundary at
 * column 1 for that row.
 *
 * @param {{index: number, type: string, ...rest: unknown}} boundary - Column boundary data with index and type properties
 * @returns {Array<{y: number, h: number | null}>} Array of vertical segments where handles should render, or empty array if boundary is fully covered by merged cells
 *
 * @example
 * ```typescript
 * // Right edge boundary - always full height
 * getBoundarySegments({ index: 2, type: 'right-edge' })
 * // Returns: [{ y: 0, h: null }]
 *
 * // Inner boundary with segments at specific rows
 * getBoundarySegments({ index: 1, type: 'inner' })
 * // Returns: [{ y: 0, h: 50 }, { y: 100, h: 25 }]
 *
 * // Boundary completely covered by merged cells
 * getBoundarySegments({ index: 1, type: 'inner' })
 * // Returns: []
 * ```
 */
function getBoundarySegments(boundary) {
  // For right-edge, always show full height
  if (boundary.type === 'right-edge') {
    return [{ y: 0, h: null }]; // null height means 100%
  }

  // Get segments for this boundary column from metadata
  // The boundary at index N is between columns N and N+1
  // So we look up segments for column index N+1 (the right edge of column N)
  const segmentsData = tableMetadata.value?.segments;
  if (!segmentsData || !Array.isArray(segmentsData)) {
    // Fallback to full-height if no segments data
    return [{ y: 0, h: null }];
  }

  // boundary.index is the column index, the boundary is at boundary.index + 1
  const boundaryColIndex = boundary.index + 1;
  const colSegments = segmentsData[boundaryColIndex];

  if (!colSegments || colSegments.length === 0) {
    // No segments for this boundary - it's completely inside merged cells
    // Return empty array to hide handle entirely for this boundary
    return [];
  }

  return colSegments.map((seg) => ({
    y: seg.y,
    h: seg.h,
  }));
}

/**
 * Generates CSS styles for positioning a resize handle segment.
 *
 * Creates an absolutely-positioned element at the specified column boundary,
 * with vertical positioning and height determined by the segment. The handle
 * is offset horizontally to center it on the boundary line.
 *
 * **Positioning Logic:**
 * - Horizontal: Positioned at `boundary.x` with -4px transform to center the 9px-wide handle
 * - Vertical: Uses `segment.y` for top position, or 0 if null
 * - Height: Uses `segment.h` for pixel height, or '100%' if null
 *
 * **Interaction:**
 * - Cursor is set to 'col-resize' for visual feedback
 * - Pointer events enabled to capture mouse interactions
 *
 * @param {{x: number, index: number, ...rest: unknown}} boundary - Column boundary data containing x position
 * @param {{y: number | null, h: number | null}} segment - Segment position (y) and height (h), null values use defaults
 * @returns {Record<string, string>} CSS style object for the handle element
 *
 * @example
 * ```typescript
 * // Full-height handle at x=100
 * getSegmentHandleStyle({ x: 100, index: 0 }, { y: null, h: null })
 * // Returns: { position: 'absolute', left: '100px', top: '0', width: '9px', height: '100%', ... }
 *
 * // Segment handle from y=50 with height 75px
 * getSegmentHandleStyle({ x: 200, index: 1 }, { y: 50, h: 75 })
 * // Returns: { position: 'absolute', left: '200px', top: '50px', width: '9px', height: '75px', ... }
 * ```
 */
function getSegmentHandleStyle(boundary, segment) {
  return {
    position: 'absolute',
    left: `${boundary.x}px`,
    top: segment.y != null ? `${segment.y}px` : '0',
    width: '9px',
    height: segment.h != null ? `${segment.h}px` : '100%',
    transform: 'translateX(-4px)',
    cursor: 'col-resize',
    pointerEvents: 'auto',
  };
}

/**
 * Get style for a resize handle (full height - kept for backwards compatibility)
 * @param {{x: number, index: number}} boundary - Column boundary data
 * @returns {Object} Style object
 */
function getHandleStyle(boundary) {
  return {
    position: 'absolute',
    left: `${boundary.x}px`,
    top: '0',
    width: '9px',
    height: '100%',
    transform: 'translateX(-4px)',
    cursor: 'col-resize',
    pointerEvents: 'auto',
  };
}

/**
 * Style for the drag guideline
 */
const guidelineStyle = computed(() => {
  if (!dragState.value || !tableMetadata.value) return { display: 'none' };

  const initialBoundary = resizableBoundaries.value[dragState.value.boundaryIndex];
  if (!initialBoundary) return { display: 'none' };

  const newX = initialBoundary.x + dragState.value.constrainedDelta;

  return {
    position: 'absolute',
    left: `${newX}px`,
    top: '0',
    width: '2px',
    height: '100%',
    backgroundColor: '#4A90E2',
    pointerEvents: 'none',
    zIndex: 20,
  };
});

/**
 * Parse table metadata from DOM element
 */
function parseTableMetadata() {
  if (!props.tableElement) {
    tableMetadata.value = null;
    return;
  }

  try {
    const boundariesAttr = props.tableElement.getAttribute('data-table-boundaries');
    if (!boundariesAttr) {
      tableMetadata.value = null;
      return;
    }

    const parsed = JSON.parse(boundariesAttr);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.columns)) {
      tableMetadata.value = null;
      return;
    }

    const validatedColumns = parsed.columns
      .filter((col) => {
        return (
          typeof col === 'object' &&
          Number.isFinite(col.i) &&
          col.i >= 0 &&
          Number.isFinite(col.x) &&
          col.x >= 0 &&
          Number.isFinite(col.w) &&
          col.w > 0 &&
          Number.isFinite(col.min) &&
          col.min > 0 &&
          (col.r === 0 || col.r === 1)
        );
      })
      .map((col) => ({
        i: col.i,
        x: Math.max(0, col.x),
        w: Math.max(1, col.w),
        min: Math.max(1, col.min),
        r: col.r,
      }));

    // Check for corrupted metadata - valid JSON but empty/invalid structure
    if (validatedColumns.length === 0) {
      tableMetadata.value = null;
      emit('resize-error', {
        error: 'Table metadata is corrupted or empty after validation',
        rawMetadata: boundariesAttr,
      });
      return;
    }

    // Extract segments if present (for merged cell support)
    // segments[colIndex] contains segment data for that column boundary
    // Each segment has {c: columnIndex, y: yPosition, h: height}
    const segments = Array.isArray(parsed.segments) ? parsed.segments : undefined;

    tableMetadata.value = { columns: validatedColumns, segments };
  } catch (error) {
    tableMetadata.value = null;
    emit('resize-error', {
      error: error instanceof Error ? error.message : 'Failed to parse table boundaries',
      rawMetadata: props.tableElement?.getAttribute('data-table-boundaries'),
    });
  }
}

/**
 * Handle mouse down on resize handle
 * @param {MouseEvent} event - Mouse event
 * @param {number} boundaryIndex - Index in the resizableBoundaries array
 */
function onHandleMouseDown(event, boundaryIndex) {
  event.preventDefault();
  event.stopPropagation();

  if (!tableMetadata.value?.columns) return;

  const boundary = resizableBoundaries.value[boundaryIndex];
  if (!boundary) return;

  const columns = tableMetadata.value.columns;
  const isRightEdge = boundary.type === 'right-edge';

  const leftColumn = columns[boundary.index];
  const rightColumn = isRightEdge ? null : columns[boundary.index + 1];

  // Store initial state
  dragState.value = {
    columnIndex: boundary.index,
    boundaryIndex,
    isRightEdge,
    initialX: event.clientX,
    initialWidths: columns.map((col) => col.w),
    leftColumn: {
      width: leftColumn.w,
      minWidth: leftColumn.min,
    },
    rightColumn: rightColumn
      ? {
          width: rightColumn.w,
          minWidth: rightColumn.min,
        }
      : null,
    constrainedDelta: 0,
  };

  // Disable pointer events on PM view to prevent conflicts
  const pmView = props.editor.view.dom;
  pmView.style.pointerEvents = 'none';

  // Add global listeners
  document.addEventListener('mousemove', onDocumentMouseMove);
  document.addEventListener('mouseup', onDocumentMouseUp);

  emit('resize-start', {
    columnIndex: boundary.index,
    isRightEdge,
    initialWidths: dragState.value.initialWidths,
  });
}

/**
 * Throttle function with cancellation support to prevent memory leaks
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between executions (ms)
 * @returns {{throttled: Function, cancel: Function}} Throttled function and cancel function
 */
function throttle(func, limit) {
  let inThrottle;
  let timeoutId = null;

  const throttled = function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      timeoutId = setTimeout(() => {
        inThrottle = false;
        timeoutId = null;
      }, limit);
    }
  };

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      inThrottle = false;
    }
  };

  return { throttled, cancel };
}

// Create throttled mouse move handler with cancellation
const mouseMoveThrottle = throttle((event) => {
  if (!dragState.value) return;

  // Calculate raw delta
  const delta = event.clientX - dragState.value.initialX;

  // Calculate constraints based on layout-computed minWidth
  const minDelta = -(dragState.value.leftColumn.width - dragState.value.leftColumn.minWidth);

  // For right edge, constrain by page content area to prevent overflow beyond margins
  // For inner boundaries, constrain by right column's minimum
  let maxDelta;
  if (dragState.value.isRightEdge) {
    // Get the page element (superdoc-page) which represents the physical page
    const tableRect = props.tableElement.getBoundingClientRect();
    const pageEl = props.tableElement.closest('.superdoc-page');

    if (pageEl) {
      const pageRect = pageEl.getBoundingClientRect();
      const tableLeftInPage = tableRect.left - pageRect.left;
      const rightMargin = tableLeftInPage; // Assumes symmetric margins
      const maxRightPosition = pageRect.right - rightMargin;
      const availableSpace = maxRightPosition - tableRect.right;
      maxDelta = Math.max(0, availableSpace);
    } else {
      // No page element found - allow unlimited expansion (fallback)
      maxDelta = Infinity;
    }
  } else {
    maxDelta = dragState.value.rightColumn.width - dragState.value.rightColumn.minWidth;
  }

  // Constrain delta
  const constrainedDelta = Math.max(minDelta, Math.min(maxDelta, delta));

  // Update visual guideline only (no PM transaction yet)
  dragState.value.constrainedDelta = constrainedDelta;

  emit('resize-move', {
    columnIndex: dragState.value.columnIndex,
    delta: constrainedDelta,
  });
}, 16);

/** Handle mouse move during drag (throttled to 16ms for 60fps) */
const onDocumentMouseMove = mouseMoveThrottle.throttled;

/**
 * Handle mouse up to end drag
 * @param {MouseEvent} event - Mouse event
 */
function onDocumentMouseUp(event) {
  if (!dragState.value) return;

  const finalDelta = dragState.value.constrainedDelta;
  const columnIndex = dragState.value.columnIndex;
  const initialWidths = dragState.value.initialWidths;
  const isRightEdge = dragState.value.isRightEdge;

  // Calculate final column widths
  const newWidths = [...initialWidths];
  newWidths[columnIndex] = initialWidths[columnIndex] + finalDelta;

  // Only adjust right column if this is an inner boundary (not right edge)
  if (!isRightEdge) {
    newWidths[columnIndex + 1] = initialWidths[columnIndex + 1] - finalDelta;
  }

  // Clean up event listeners and restore pointer events
  document.removeEventListener('mousemove', onDocumentMouseMove);
  document.removeEventListener('mouseup', onDocumentMouseUp);

  if (props.editor?.view) {
    const pmView = props.editor.view.dom;
    if (pmView && pmView.style) {
      pmView.style.pointerEvents = 'auto';
    }
  }

  // Only dispatch transaction if:
  // 1. Not a forced cleanup
  // 2. Delta is significant (> 1px)
  if (!forcedCleanup.value && Math.abs(finalDelta) > 1) {
    dispatchResizeTransaction(columnIndex, newWidths);

    emit('resize-end', {
      columnIndex,
      finalWidths: newWidths,
      delta: finalDelta,
    });
  }

  // Clear drag state
  dragState.value = null;
}

/**
 * Dispatch ProseMirror transaction to update column widths
 * Updates both grid (twips) and colwidth (pixels) attributes
 *
 * @param {number} columnIndex - Index of the resized column
 * @param {number[]} newWidths - New column widths in pixels
 */
function dispatchResizeTransaction(columnIndex, newWidths) {
  if (!props.editor?.view || !props.tableElement) {
    return;
  }

  try {
    const { state, dispatch } = props.editor.view;
    const tr = state.tr;

    // Find table position
    const tablePos = findTablePosition(state, props.tableElement);

    if (tablePos === null) {
      emit('resize-error', {
        columnIndex,
        error: 'Table position not found in document',
      });
      return;
    }

    // Get table node
    const tableNode = state.doc.nodeAt(tablePos);

    if (!tableNode || tableNode.type.name !== 'table') {
      emit('resize-error', {
        columnIndex,
        error: 'Invalid table node at position',
      });
      return;
    }

    // Convert pixel widths to twips for grid attribute
    const gridTwips = newWidths.map((w) => pixelsToTwips(w));
    const newGrid = gridTwips.map((twips) => ({ col: twips }));

    // Calculate total table width in twips for tableWidth attribute
    const totalWidthTwips = gridTwips.reduce((sum, w) => sum + w, 0);

    // Update table node with new grid, tableWidth, and userEdited flag
    const newAttrs = {
      ...tableNode.attrs,
      grid: newGrid,
      tableWidth: totalWidthTwips,
      userEdited: true,
    };

    tr.setNodeMarkup(tablePos, null, newAttrs);

    // Update affected cell colwidth attributes
    const affectedColumns = [columnIndex, columnIndex + 1];
    updateCellColwidths(tr, tableNode, tablePos, affectedColumns, newWidths);

    // Dispatch transaction
    dispatch(tr);

    // Invalidate the measure cache for this table to force re-measurement with new widths
    const blockId = props.tableElement?.getAttribute('data-sd-block-id');
    if (blockId && blockId.trim()) {
      measureCache.invalidate([blockId]);
    }

    // Emit success event
    emit('resize-success', { columnIndex, newWidths });
  } catch (error) {
    emit('resize-error', {
      columnIndex,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Find the position of the table node in the document
 * @param {Object} state - ProseMirror state
 * @param {HTMLElement} tableElement - Table DOM element
 * @returns {number | null} Position of table node or null
 */
function findTablePosition(state, tableElement) {
  // Strategy: Use ProseMirror position markers (data-pm-start/data-pm-end) from table cells
  // to find which table node in the document matches this DOM element

  // Find any element with data-pm-start inside the table
  const pmElement = tableElement.querySelector('[data-pm-start]');

  if (!pmElement) {
    return null;
  }

  const pmStart = parseInt(pmElement.getAttribute('data-pm-start'), 10);

  // Find the table node that contains this position
  let tablePos = null;
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'table') {
      const tableEnd = pos + node.nodeSize;

      // Check if pmStart is within this table's range
      if (pmStart >= pos && pmStart < tableEnd) {
        tablePos = pos;
        return false; // Stop iteration
      }
    }
  });

  return tablePos;
}

/**
 * Update colwidth attributes on cells in affected columns
 * Uses ProseMirror's descendants API for proper position resolution
 * @param {Object} tr - ProseMirror transaction
 * @param {Object} tableNode - Table node
 * @param {number} tablePos - Position of table node
 * @param {number[]} affectedColumns - Column indices that changed
 * @param {number[]} newWidths - New column widths in pixels
 */
function updateCellColwidths(tr, tableNode, tablePos, affectedColumns, newWidths) {
  let currentRow = 0;
  let currentCol = 0;

  tableNode.descendants((node, pos, parent) => {
    if (node.type.name === 'tableRow') {
      currentCol = 0;
      return true; // Continue descending
    }

    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      const { colspan = 1 } = node.attrs;

      // Check if this cell is in an affected column
      const cellAffectsColumns = affectedColumns.some(
        (affectedCol) => affectedCol >= currentCol && affectedCol < currentCol + colspan,
      );

      if (cellAffectsColumns) {
        // Calculate absolute position in document
        const absolutePos = tablePos + 1 + pos;

        // Build new colwidth array for this cell
        const newColwidth = [];
        for (let i = 0; i < colspan; i++) {
          const colIndex = currentCol + i;
          const width = newWidths[colIndex];
          if (width !== undefined && width > 0) {
            newColwidth.push(width);
          }
        }

        // Only update if we have valid widths
        // colwidth must always be an array, even for single columns
        if (newColwidth.length > 0) {
          tr.setNodeMarkup(absolutePos, null, {
            ...node.attrs,
            colwidth: newColwidth,
          });
        }
      }

      currentCol += colspan;
      return false; // Don't descend into cell content
    }

    return true;
  });
}

/**
 * Watch for changes to table element and reparse metadata
 */
watch(
  () => props.tableElement,
  () => {
    parseTableMetadata();
  },
  { immediate: true },
);

/**
 * Watch for visibility changes
 */
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      parseTableMetadata();
    } else {
      // Clean up drag state if overlay is hidden
      if (dragState.value) {
        forcedCleanup.value = true;
        onDocumentMouseUp(new MouseEvent('mouseup'));
        forcedCleanup.value = false;
      }
    }
  },
);

/**
 * Clean up on unmount
 */
onBeforeUnmount(() => {
  // Cancel any pending throttled calls to prevent memory leaks
  mouseMoveThrottle.cancel();

  if (dragState.value) {
    document.removeEventListener('mousemove', onDocumentMouseMove);
    document.removeEventListener('mouseup', onDocumentMouseUp);

    // Re-enable PM pointer events
    if (props.editor?.view?.dom) {
      props.editor.view.dom.style.pointerEvents = 'auto';
    }
  }
});
</script>

<style scoped>
.superdoc-table-resize-overlay {
  position: absolute;
  pointer-events: none;
  user-select: none;
}

.resize-handle {
  position: absolute;
  cursor: col-resize;
  user-select: none;
  z-index: 15;
}

.resize-handle::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 100%;
  background-color: rgba(74, 144, 226, 0.3);
  transform: translateX(-1px);
  transition:
    background-color 0.2s ease,
    width 0.2s ease;
}

.resize-handle:hover::before {
  background-color: #4a90e2;
  width: 3px;
  transform: translateX(-1.5px);
}

.resize-handle--active::before {
  background-color: #4a90e2;
  width: 2px;
  transform: translateX(-1px);
}

.resize-guideline {
  position: absolute;
  background-color: #4a90e2;
  pointer-events: none;
  box-shadow: 0 0 4px rgba(74, 144, 226, 0.5);
}
</style>
