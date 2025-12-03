<script setup>
import { ref, onMounted, onBeforeUnmount, markRaw } from 'vue';
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
 * Handle link click events from layout-engine rendered links.
 * This handler listens for the custom 'superdoc-link-click' event
 * dispatched by link elements in the DOM painter.
 *
 * @param {CustomEvent} event - Custom event with link metadata in event.detail
 */
const handleLinkClick = (event) => {
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

  // Move cursor to the click position first
  moveCursorToMouseEvent(event.detail, props.editor);

  // Check if the cursor is now on a link mark after moving
  // Use a small timeout to ensure the selection has been updated
  setTimeout(() => {
    // IMPORTANT: Use CURRENT state after cursor movement, not stale captured state
    const currentState = props.editor.state;
    const hasLink = selectionHasNodeOrMark(currentState, 'link', { requireEnds: true });

    if (hasLink) {
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
          left: `${event.detail.clientX - surfaceRect.left}px`,
          top: `${event.detail.clientY - surfaceRect.top + 15}px`,
        },
      );
    }
  }, 10);
};

/**
 * Lifecycle hooks for attaching/detaching event listeners
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
