<script setup>
import { storeToRefs } from 'pinia';
import { onMounted, ref, computed, watch, nextTick } from 'vue';
import { useCommentsStore } from '@superdoc/stores/comments-store';
import { useSuperdocStore } from '@superdoc/stores/superdoc-store';
import { useFloatingComment } from './use-floating-comment';
import CommentDialog from '@superdoc/components/CommentsLayer/CommentDialog.vue';

const superdocStore = useSuperdocStore();
const commentsStore = useCommentsStore();

//prettier-ignore
const {
  documentsWithConverations,
  floatingCommentsOffset,
  visibleConversations,
  sortedConversations,
  activeComment,
  commentsList,
  getGroupedComments,
  lastChange,
  generalCommentIds,
  isFloatingCommentsReady,
  getFloatingComments,
} = storeToRefs(commentsStore);
const { user, activeZoom } = storeToRefs(superdocStore);

const props = defineProps({
  currentDocument: {
    type: Object,
    required: true,
  },
  parent: {
    type: Object,
    required: true,
  },
});

/**
 * Floating comments layer
 *
 * This component works by first sorting through all comments in order top-to-bottom
 * Then rendering each comment one at a time, checking for potential comment overlaps as each
 * new comment is added.
 */

let offset = 0;
const floatingCommentsContainer = ref(null);

const handleDialogReady = ({ commentId: dialogId, elementRef }) => {
  // Called when a dialog has mounted
  const dialogIndex = sortedConversations.value.findIndex((c) => c.commentId === dialogId);
  if (dialogIndex === -1 || dialogIndex >= sortedConversations.length - 1) return;

  // This is our current comment
  const dialog = visibleConversations.value[dialogIndex];
  if (!dialog) return;

  if (!activeComment.value) {
    floatingCommentsOffset.value = 0;
  } else if (dialogId === activeComment.value) {
    floatingCommentsOffset.value = (dialog.floatingPosition.top - dialog.selection?.selectionBounds?.top) * -1;
  }

  nextTick(() => {
    const selectionBounds = elementRef.value?.getBoundingClientRect();
    renderDialog(sortedConversations.value[dialogIndex + 1], sortedConversations.value[dialogIndex], selectionBounds)
  });
};

/**
 * Render the next dialog. Check to see if it would overlap with the previous one and if so,
 * adjust the top position of the next dialog.
 * 
 * @param {Object} data The next comment to render
 * @param {Object} previousNode The previous comment rendered
 * @param {Object} previousBounds The bounds of the previous comment
 * @returns {void}
 */
const renderDialog = (data, previousNode, previousBounds) => {
  if (!data) return;
  const nextConvo = data;
  const commentTop = Number(nextConvo.selection?.selectionBounds?.top);

  const previousTop = Number(previousNode.floatingPosition?.top);
  const previousBottom = previousTop + Number(previousBounds.height);

  nextConvo.floatingPosition.top = Number(data.floatingPosition?.top);
  if (commentTop <= previousBottom || !nextConvo.floatingPosition.top) {
    nextConvo.floatingPosition.top = previousBottom + 5;
  }

  visibleConversations.value.push(nextConvo);
};

const initialize = () => {
  requestAnimationFrame(() => {
    visibleConversations.value = [];
    sortedConversations.value = [];
    nextTick(() => initializeConvos());
  });
};

const initializeConvos = () => {
  sortedConversations.value = getFloatingComments.value;
  if (!sortedConversations.value?.length) return;
  
  isFloatingCommentsReady.value = true;
  const firstComment = sortedConversations.value[0];
  const offset = firstComment.selection?.selectionBounds?.top || floatingCommentsOffset.value;
  firstComment.floatingPosition = { top: offset };
  visibleConversations.value.push(firstComment);
};

const getCommentPosition = (floatingComment) => {
  return {
    top: floatingComment.floatingPosition.top + 'px',
  };
};

const getFloatingSidebarStyle = computed(() => {
  return {
    transform: `translateY(${floatingCommentsOffset.value}px)`,
    transition: 'all 0.3s ease',
  };
});

/**
 * Update the offset of the floating comments
 * 
 * @returns {void}
 */
const updateOffset = () => {
  const comment = commentsStore.getComment(activeComment.value);
  if (!comment) floatingCommentsOffset.value = 0;
  else {
    const bounds = floatingCommentsOffset.value = comment.floatingPosition.top;
  }
};

// Update the floating comments when the conversations change
watch(lastChange, (newVal) => initialize());
watch(activeComment, (newVal) => {
  if (generalCommentIds.value.includes(newVal)) return;
  else {
    initialize();
  }
});
watch(activeZoom, () => {
  initialize();
});

onMounted(() => {
  initialize();
});

</script>

<template>
  <div class="section-wrapper" ref="floatingCommentsContainer">
    <div :style="getFloatingSidebarStyle" class="sidebar-container" :key="lastChange">
      <div v-for="floatingComment in visibleConversations">
        <CommentDialog
          class="floating-comment"
          @ready="handleDialogReady"
          :parent="parent"
          :style="getCommentPosition(floatingComment)"
          :comment="floatingComment"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-wrapper {
  position: relative;
  min-height: 100%;
  width: 300px;
}
.floating-comment {
  position: absolute;
  min-width: 300px;
}
</style>
