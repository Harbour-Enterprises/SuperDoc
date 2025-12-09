<script setup>
import { onMounted, onBeforeUnmount, markRaw } from 'vue';
import { TextSelection } from 'prosemirror-state';
import { getEditorSurfaceElement } from '../../core/helpers/editorSurface.js';
import { moveCursorToMouseEvent, selectionHasNodeOrMark } from '../cursor-helpers.js';
import LinkInput from '../toolbar/LinkInput.vue';

const props = defineProps({
  editor: {
    type: Object,
    required: true,
  },
  openPopover: {
    type: Function,
    required: true,
  },
  closePopover: {
    type: Function,
    required: true,
  },
  popoverVisible: {
    type: Boolean,
    default: false,
  },
});

/**
 * Debounce tracking to prevent double-handling of link clicks.
 * The pointerdown handler in PresentationEditor dispatches superdoc-link-click,
 * and then the click handler in the renderer also dispatches it.
 * We only want to handle the first one.
 */
let lastLinkClickTime = 0;
const LINK_CLICK_DEBOUNCE_MS = 300;

/**
 * Timeout delay for cursor update before checking link mark presence.
 * Allows the editor state to update after cursor movement.
 */
const CURSOR_UPDATE_TIMEOUT_MS = 10;

/**
 * Handle link click events from layout-engine rendered links.
 * This handler listens for the custom 'superdoc-link-click' event
 * dispatched by link elements in the DOM painter.
 *
 * @param {CustomEvent} event - Custom event with link metadata in event.detail
 * @param {Object} event.detail - Event detail containing link information
 * @param {HTMLElement} [event.detail.element] - The link element that was clicked
 * @param {string} [event.detail.href] - The href attribute of the link
 * @param {number} event.detail.clientX - X coordinate of the click
 * @param {number} event.detail.clientY - Y coordinate of the click
 */
const handleLinkClick = (event) => {
  const detail = event?.detail ?? {};
  const linkElement = detail.element;
  const now = Date.now();

  // Debounce to prevent double-handling (pointerdown + click both dispatch events)
  if (now - lastLinkClickTime < LINK_CLICK_DEBOUNCE_MS) {
    return;
  }
  lastLinkClickTime = now;

  // If popover is already visible, close it and don't reopen
  // This allows clicking a link to toggle the popover off
  if (props.popoverVisible) {
    props.closePopover();
    return;
  }

  if (!props.editor || !props.editor.state) {
    return;
  }

  const surface = getEditorSurfaceElement(props.editor);
  if (!surface) {
    return;
  }

  // Get PM position from the link element's data attributes (set by layout-engine renderer)
  // This is more reliable than using posAtCoords which doesn't work well with layout-engine DOM
  const pmStart = linkElement?.dataset?.pmStart;

  if (pmStart != null) {
    // Move cursor to the link position using the PM position from the element
    const pos = parseInt(pmStart, 10);
    const state = props.editor.state;
    const doc = state.doc;

    // Validate position is a valid number and within document bounds
    if (!isNaN(pos) && pos >= 0 && pos <= doc.content.size) {
      const tr = state.tr.setSelection(TextSelection.create(doc, pos));
      props.editor.dispatch(tr);
    } else {
      // Invalid or out-of-bounds position - fallback to coordinate-based positioning
      console.warn(`Invalid PM position from data-pm-start: ${pmStart}, falling back to coordinate-based positioning`);
      moveCursorToMouseEvent(detail, props.editor);
    }
  } else {
    // Fallback to coordinate-based positioning (may not work well with layout-engine)
    moveCursorToMouseEvent(detail, props.editor);
  }

  // Check if the cursor is now on a link mark after moving
  // Use a small timeout to ensure the selection has been updated
  setTimeout(() => {
    // IMPORTANT: Use CURRENT state after cursor movement, not stale captured state
    const currentState = props.editor.state;
    const $from = currentState.selection.$from;
    const linkMarkType = currentState.schema.marks.link;

    // Check marks at cursor position and on adjacent nodes
    const nodeAfter = $from.nodeAfter;
    const nodeBefore = $from.nodeBefore;
    const marksOnNodeAfter = nodeAfter?.marks || [];
    const marksOnNodeBefore = nodeBefore?.marks || [];

    // Check if cursor is adjacent to a link (nodeAfter or nodeBefore has link mark)
    // This handles the case where cursor is at the boundary of a link mark
    const linkOnNodeAfter = linkMarkType && marksOnNodeAfter.some((m) => m.type === linkMarkType);
    const linkOnNodeBefore = linkMarkType && marksOnNodeBefore.some((m) => m.type === linkMarkType);
    const hasLinkAdjacent = linkOnNodeAfter || linkOnNodeBefore;

    const hasLink = selectionHasNodeOrMark(currentState, 'link', { requireEnds: true });

    // Use hasLinkAdjacent as fallback for when cursor is at mark boundary
    if (hasLink || hasLinkAdjacent) {
      const surfaceRect = surface.getBoundingClientRect();
      if (!surfaceRect) return;

      // Calculate popover position relative to the surface
      props.openPopover(
        markRaw(LinkInput),
        {
          showInput: true,
          editor: props.editor,
          closePopover: props.closePopover,
        },
        {
          left: `${detail.clientX - surfaceRect.left}px`,
          top: `${detail.clientY - surfaceRect.top + 15}px`,
        },
      );
    }
  }, CURSOR_UPDATE_TIMEOUT_MS);
};

/**
 * Reference to the editor surface element where link click events are attached.
 * Cached on mount to enable proper cleanup on unmount.
 *
 * @type {HTMLElement | null}
 */
let surfaceElement = null;

onMounted(() => {
  if (!props.editor) return;

  // Attach link click listener to the editor surface
  surfaceElement = getEditorSurfaceElement(props.editor);
  if (surfaceElement) {
    surfaceElement.addEventListener('superdoc-link-click', handleLinkClick);
  }
});

onBeforeUnmount(() => {
  // Clean up event listener
  if (surfaceElement) {
    surfaceElement.removeEventListener('superdoc-link-click', handleLinkClick);
  }
});
</script>

<template>
  <!-- This component has no visual output - it only handles events -->
</template>
