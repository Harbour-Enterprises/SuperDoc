<script setup>
import '@harbour-enterprises/common/styles/common-styles.css';
import { superdocIcons } from './icons.js';
//prettier-ignore
import {
  getCurrentInstance,
  ref,
  onMounted,
  onBeforeUnmount,
  nextTick,
  computed,
  reactive,
  watch,
} from 'vue';
import { storeToRefs } from 'pinia';

import PdfViewer from './components/PdfViewer/PdfViewer.vue';
import CommentsLayer from './components/CommentsLayer/CommentsLayer.vue';
import CommentDialog from '@superdoc/components/CommentsLayer/CommentDialog.vue';
import FloatingComments from '@superdoc/components/CommentsLayer/FloatingComments.vue';
import HrbrFieldsLayer from '@superdoc/components/HrbrFieldsLayer/HrbrFieldsLayer.vue';
import useSelection from '@superdoc/helpers/use-selection';

import { useSuperdocStore } from '@superdoc/stores/superdoc-store';
import { useCommentsStore } from '@superdoc/stores/comments-store';

import { DOCX, PDF, HTML } from '@harbour-enterprises/common';
import { SuperEditor } from '@harbour-enterprises/super-editor';
import HtmlViewer from './components/HtmlViewer/HtmlViewer.vue';
import useComment from './components/CommentsLayer/use-comment';
import AiLayer from './components/AiLayer/AiLayer.vue';

// Stores
const superdocStore = useSuperdocStore();
const commentsStore = useCommentsStore();
const emit = defineEmits(['selection-update']);

//prettier-ignore
const {
  documents,
  isReady,
  areDocumentsReady,
  selectionPosition,
  activeSelection,
  activeZoom,
} = storeToRefs(superdocStore);
const { handlePageReady, modules, user, getDocument } = superdocStore;

//prettier-ignore
const {
  getConfig,
  documentsWithConverations,
  commentsList,
  pendingComment,
  activeComment,
  skipSelectionUpdate,
  commentsByDocument,
  isCommentsListVisible,
  isFloatingCommentsReady,
} = storeToRefs(commentsStore);
const { initialCheck, showAddComment, handleEditorLocationsUpdate } = commentsStore;
const { proxy } = getCurrentInstance();
commentsStore.proxy = proxy;

// Refs
const layers = ref(null);
const isCollaborationReady = ref(false);

// Comments layer
const commentsLayer = ref(null);
const toolsMenuPosition = reactive({ top: null, right: '-25px', zIndex: 101 });

// Hrbr Fields
const hrbrFieldsLayer = ref(null);

const handleDocumentReady = (documentId, container) => {
  const doc = getDocument(documentId);
  doc.isReady = true;
  doc.container = container;
  if (areDocumentsReady.value) {
    if (!proxy.$superdoc.config.collaboration) isReady.value = true;
    nextTick(() => initialCheck());
  }
  proxy.$superdoc.broadcastPdfDocumentReady();
};

const handleToolClick = (tool) => {
  const toolOptions = {
    comments: () => showAddComment(proxy.$superdoc),
  };

  if (tool in toolOptions) {
    toolOptions[tool](activeSelection.value, selectionPosition.value);
  }

  activeSelection.value = null;
  toolsMenuPosition.top = null;
};

const handleDocumentMouseDown = (e) => {
  if (pendingComment.value) return;
};

const handleHighlightClick = () => (toolsMenuPosition.top = null);
const cancelPendingComment = (e) => {
  if (e.target.classList.contains('n-dropdown-option-body__label')) return;
  commentsStore.removePendingComment();
};

const onCommentsLoaded = ({ editor, comments }) => {
  commentsStore.processLoadedDocxComments({ comments, documentId: editor.options.documentId });
};

const onEditorBeforeCreate = ({ editor }) => {
  proxy.$superdoc.broadcastEditorBeforeCreate(editor);
};

const onEditorCreate = ({ editor }) => {
  const { documentId } = editor.options;
  const doc = getDocument(documentId);
  doc.setEditor(editor);
  proxy.$superdoc.activeEditor = editor;
  proxy.$superdoc.broadcastEditorCreate(editor);
  proxy.$superdoc.log('[SuperDoc] Editor created', proxy.$superdoc.activeEditor);
  proxy.$superdoc.log('[SuperDoc] Page styles (pixels)', editor.getPageStyles());
};

const onEditorDestroy = () => {
  proxy.$superdoc.broadcastEditorDestroy();
};

const onEditorFocus = ({ editor }) => {
  proxy.$superdoc.setActiveEditor(editor);
};

const onEditorDocumentLocked = ({ editor, isLocked, lockedBy }) => {
  proxy.$superdoc.lockSuperdoc(isLocked, lockedBy);
};

const onEditorSelectionChange = ({ editor, transaction }) => {
  if (skipSelectionUpdate.value) {
    // When comment is added selection will be equal to comment text
    // Should skip calculations to keep text selection for comments correct
    skipSelectionUpdate.value = false;
    return;
  }

  const { documentId } = editor.options;
  const { $from, $to } = transaction.selection;
  if ($from.pos === $to.pos) updateSelection({ x: null, y: null, x2: null, y2: null, source: 'super-editor' });

  if (!layers.value) return;
  const { view } = editor;
  const fromCoords = view.coordsAtPos($from.pos);
  const toCoords = view.coordsAtPos($to.pos);
  const { pageMargins } = editor.getPageStyles();

  const layerBounds = layers.value.getBoundingClientRect();
  let top = fromCoords.top - layerBounds.top;
  top = Math.max(96, (top - 100));
  const selectionBounds = {
    top,
    left: fromCoords.left,
    right: toCoords.left,
    bottom: toCoords.bottom - layerBounds.top,
  };

  const selection = useSelection({
    selectionBounds,
    page: 1,
    documentId,
    source: 'super-editor',
  });

  handleSelectionChange(selection);
};

function getSelectionBoundingBox() {
  const selection = window.getSelection();

  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    return range.getBoundingClientRect();
  }

  return null;
}

const onEditorCollaborationReady = ({ editor }) => {
  proxy.$superdoc.emit('collaboration-ready', { editor });

  nextTick(() => {
    commentsStore.lastChange = Date.now();
    isReady.value = true;
  });
};

const onEditorContentError = ({ error, editor }) => {
  proxy.$superdoc.emit('content-error', { error, editor });
};

const onEditorException = ({ error, editor }) => {
  proxy.$superdoc.emit('exception', { error, editor });
};

const editorOptions = (doc) => {
  const options = {
    pagination: proxy.$superdoc.config.pagination,
    documentId: doc.id,
    user: proxy.$superdoc.user,
    users: proxy.$superdoc.users,
    colors: proxy.$superdoc.colors,
    role: proxy.$superdoc.config.role,
    documentMode: proxy.$superdoc.config.documentMode,
    rulers: doc.rulers,
    isInternal: proxy.$superdoc.config.isInternal,
    annotations: proxy.$superdoc.config.annotations,
    isCommentsEnabled: proxy.$superdoc.config.modules?.comments,
    onBeforeCreate: onEditorBeforeCreate,
    onCreate: onEditorCreate,
    onDestroy: onEditorDestroy,
    onFocus: onEditorFocus,
    onDocumentLocked: onEditorDocumentLocked,
    onSelectionUpdate: onEditorSelectionChange,
    onCollaborationReady: onEditorCollaborationReady,
    onContentError: onEditorContentError,
    onException: onEditorException,
    onCommentsLoaded,
    onCommentsUpdate: onEditorCommentsUpdate,
    onCommentLocationsUpdate: onEditorCommentLocationsUpdate,
    ydoc: doc.ydoc,
    collaborationProvider: doc.provider || null,
    isNewFile: doc.isNewFile || false,
    handleImageUpload: proxy.$superdoc.config.handleImageUpload,
    telemetry: proxy.$superdoc.telemetry,
  };

  return options;
};

/**
 * Trigger a comment-positions location update
 * This is called when the editor has updated the comment locations
 * 
 * @returns {void}
 */
const onEditorCommentLocationsUpdate = () => {
  if (!proxy.$superdoc.config.modules?.comments) return;
  handleEditorLocationsUpdate(layers.value);

  setTimeout(() => {
    commentsStore.lastChange = Date.now();
  }, 250);
};

const onEditorCommentsUpdate = (params) => {
  // Set the active comment in the store
  const { activeCommentId } = params;

  nextTick(() => {
    commentsStore.setActiveComment(activeCommentId);
  });

  // Bubble up the event to the user, if handled
  if (typeof proxy.$superdoc.config.onCommentsUpdate === 'function') {
    proxy.$superdoc.config.onCommentsUpdate(params);
  }
};

const isCommentsEnabled = computed(() => 'comments' in modules);
const showCommentsSidebar = computed(() => {
  return (
    pendingComment.value ||
    (
      commentsList.value?.length > 0
        && layers.value
        && isReady.value
        && isCommentsEnabled.value
        && !isCommentsListVisible.value
    )
  );
});

const showToolsFloatingMenu = computed(() => {
  if (!isCommentsEnabled.value) return false;
  return toolsMenuPosition.top && !getConfig.value?.readOnly;
});
const showActiveSelection = computed(() => {
  if (!isCommentsEnabled.value) return false;
  !getConfig?.readOnly && selectionPosition.value;
});

watch(showCommentsSidebar, (value) => {
  proxy.$superdoc.broadcastSidebarToggle(value);
});

onMounted(() => {
  if (isCommentsEnabled.value && !modules.comments.readOnly) {
    document.addEventListener('mousedown', handleDocumentMouseDown);
  }
  proxy.$superdoc.on('ai-highlight-add', handleAiHighlightAdd);
  proxy.$superdoc.on('ai-highlight-remove', handleAiHighlightRemove);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentMouseDown);
  proxy.$superdoc.off('ai-highlight-add', handleAiHighlightAdd);
  proxy.$superdoc.off('ai-highlight-remove', handleAiHighlightRemove);
});

const selectionLayer = ref(null);
const isDragging = ref(false);

const getSelectionPosition = computed(() => {
  if (!selectionPosition.value || selectionPosition.value.source === 'super-editor') {
    return { x: null, y: null };
  }

  const top = selectionPosition.value.top;
  const left = selectionPosition.value.left;
  const right = selectionPosition.value.right;
  const bottom = selectionPosition.value.bottom;
  const style = {
    zIndex: 500,
    borderRadius: '4px',
    top: top + 'px',
    left: left + 'px',
    height: Math.abs(top - bottom) + 'px',
    width: Math.abs(left - right) + 'px',
  };
  return style;
});

const handleSelectionChange = (selection) => {
  if (!selection.selectionBounds || !isCommentsEnabled.value) return;

  const isMobileView = window.matchMedia('(max-width: 768px)').matches;

  updateSelection({
    startX: selection.selectionBounds.left,
    startY: selection.selectionBounds.top,
    x: selection.selectionBounds.right,
    y: selection.selectionBounds.bottom,
    source: selection.source,
  });

  if (!selectionPosition.value) return;
  const selectionIsWideEnough =
    Math.abs(selectionPosition.value.left - selectionPosition.value.right) > 5;
  const selectionIsTallEnough =
    Math.abs(selectionPosition.value.top - selectionPosition.value.bottom) > 5;
  if (!selectionIsWideEnough || !selectionIsTallEnough) {
    selectionLayer.value.style.pointerEvents = 'none';
    resetSelection();
    return;
  }

  activeSelection.value = selection;

  // Place the tools menu at the level of the selection
  let top = selection.selectionBounds.top;
  if (selection.bottom - selection.selectionBounds.top < 0) {
    top = selection.selectionBounds.botton;
  }

  toolsMenuPosition.top = top - 20 + 'px';
  toolsMenuPosition.right = isMobileView ? '0' : '-25px';
};

const resetSelection = () => {
  selectionPosition.value = null;
};

const updateSelection = ({ startX, startY, x, y, source }) => {
  const hasStartCoords = startX || startY;
  const hasEndCoords = x || y;

  if (!hasStartCoords && !hasEndCoords) {
    return (selectionPosition.value = null);
  }

  // Initialize the selection position
  if (!selectionPosition.value) {
    if (startY <= 0 || startX <= 0) return;
    selectionPosition.value = {
      top: startY,
      left: startX,
      right: startX,
      bottom: startY,
      startX,
      startY,
      source,
    };
  }

  if (startX) selectionPosition.value.startX = startX;
  if (startY) selectionPosition.value.startY = startY;

  // Reverse the selection if the user drags up or left
  const selectionTop = selectionPosition.value.startY;
  if (y < selectionTop) {
    selectionPosition.value.top = y;
  } else {
    selectionPosition.value.bottom = y;
  }

  const selectionLeft = selectionPosition.value.startX;
  if (x < selectionLeft) {
    selectionPosition.value.left = x;
  } else {
    selectionPosition.value.right = x;
  }
};

const handleSelectionStart = (e) => {
  resetSelection();
  selectionLayer.value.style.pointerEvents = 'auto';

  nextTick(() => {
    isDragging.value = true;
    const y = e.offsetY / activeZoom.value;
    const x = e.offsetX / activeZoom.value;
    updateSelection({ startX: x, startY: y });
    selectionLayer.value.addEventListener('mousemove', handleDragMove);
  });
};

const handleDragMove = (e) => {
  if (!isDragging.value) return;
  const y = e.offsetY / activeZoom.value;
  const x = e.offsetX / activeZoom.value;
  updateSelection({ x, y });
};

const handleDragEnd = (e) => {
  if (!isDragging.value) return;
  selectionLayer.value.removeEventListener('mousemove', handleDragMove);

  if (!selectionPosition.value) return;
  const selection = useSelection({
    selectionBounds: {
      top: selectionPosition.value.top,
      left: selectionPosition.value.left,
      right: selectionPosition.value.right,
      bottom: selectionPosition.value.bottom,
    },
    documentId: documents.value[0].id,
  });
  handleSelectionChange(selection);
  selectionLayer.value.style.pointerEvents = 'none';
};

const handleSuperEditorPageMarginsChange = (doc, params) => {
  doc.documentMarginsLastChange = params.pageMargins;
};

const handlePdfClick = (e) => {
  if (!isCommentsEnabled.value) return;
  resetSelection();
  isDragging.value = true;
  handleSelectionStart(e);
};

const aiLayer = ref(null);

const handleAiHighlightAdd = () => {
  if (!aiLayer.value) {
    console.error('[Superdoc] aiLayer.value is not available');
    return;
  }
  aiLayer.value.addAiHighlight();
};

const handleAiHighlightRemove = () => {
  if (!aiLayer.value) {
    console.error('[Superdoc] aiLayer.value is not available');
    return;
  }
  aiLayer.value.removeAiHighlight();
};
</script>

<template>
  <div class="superdoc" :class="{ 'superdoc--with-sidebar': showCommentsSidebar }">
    <div class="superdoc__layers layers" ref="layers">

      <!-- Floating tools menu (shows up when user has text selection)-->
      <div v-if="showToolsFloatingMenu" class="superdoc__tools tools" :style="toolsMenuPosition">
        <div class="tools-item" data-id="is-tool" @click.stop.prevent="handleToolClick('comments')">
          <div class="superdoc__tools-icon" v-html="superdocIcons.comment"></div>
        </div>
      </div>

      <div class="superdoc__document document">
        <div
          v-if="isCommentsEnabled"
          class="superdoc__selection-layer selection-layer"
          @mousedown="handleSelectionStart"
          @mouseup="handleDragEnd"
          ref="selectionLayer"
        >
          <div
            :style="getSelectionPosition"
            class="superdoc__temp-selection temp-selection sd-highlight sd-initial-highlight"
            v-if="selectionPosition"
          ></div>
        </div>

        <!-- Fields layer -->
        <HrbrFieldsLayer
          v-if="'hrbr-fields' in modules && layers"
          :fields="modules['hrbr-fields']"
          class="superdoc__comments-layer comments-layer"
          style="z-index: 2"
          ref="hrbrFieldsLayer"
        />

        <!-- On-document comments layer -->
        <!-- <CommentsLayer
          class="superdoc__comments-layer comments-layer"
          v-if="showCommentsSidebar"
          style="z-index: 3"
          ref="commentsLayer"
          :parent="layers"
          :user="user"
          @highlight-click="handleHighlightClick"
        /> -->

        <!-- AI Layer for temporary highlights -->
        <AiLayer class="ai-layer" style="z-index: 4" ref="aiLayer" />

        <div class="superdoc__sub-document sub-document" v-for="doc in documents" :key="doc.id">
          <!-- PDF renderer -->

          <PdfViewer
            v-if="doc.type === PDF"
            :document-data="doc"
            @selection-change="handleSelectionChange"
            @ready="handleDocumentReady"
            @page-loaded="handlePageReady"
            @bypass-selection="handlePdfClick"
          />

          <SuperEditor
            v-if="doc.type === DOCX"
            :file-source="doc.data"
            :state="doc.state"
            :document-id="doc.id"
            :options="editorOptions(doc)"
            @pageMarginsChange="handleSuperEditorPageMarginsChange(doc, $event)"
          />

          <!-- omitting field props -->
          <HtmlViewer
            v-if="doc.type === HTML"
            @ready="(id) => handleDocumentReady(id, null)"
            @selection-change="handleSelectionChange"
            :file-source="doc.data"
            :document-id="doc.id"
          />
        </div>
      </div>
    </div>

    <div class="superdoc__right-sidebar right-sidebar" v-if="showCommentsSidebar">
      <CommentDialog
        v-if="pendingComment"
        :comment="pendingComment"
        :auto-focus="true"
        :is-floating="true"
        v-click-outside="cancelPendingComment"
      />

      <FloatingComments
        class="floating-comments"
        v-if="isReady && isFloatingCommentsReady && !isCommentsListVisible"
        v-for="doc in documentsWithConverations"
        :parent="layers"
        :current-document="doc"
      />
    </div>
  </div>
</template>

<style scoped>
.superdoc {
  display: flex;
}

.superdoc--with-sidebar { /*  */ }

.superdoc__layers {
  height: 100%;
  position: relative;
  box-sizing: border-box;
}

.superdoc__document {
  width: 100%;
  position: relative;
}

.superdoc__sub-document {
  width: 100%;
  position: relative;
}

.superdoc__selection-layer {
  position: absolute;
  min-width: 100%;
  min-height: 100%;
  z-index: 10;
  pointer-events: none;
}

.superdoc__temp-selection {
  position: absolute;
}

.superdoc__comments-layer {
  /* position: absolute; */
  top: 0;
  height: 100%;
  position: relative;
}

.superdoc__right-sidebar {
  width: 320px;
  padding: 0 10px;
  min-height: 100%;
  position: relative;
  z-index: 2;
}

/* Tools styles */
.tools {
  position: absolute;
  z-index: 3;
  display: flex;
  gap: 6px;
}

.tools .tool-icon {
  font-size: 20px;
  border-radius: 12px;
  border: none;
  outline: none;
  background-color: #dbdbdb;
  cursor: pointer;
}

.tools-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background-color: rgba(219, 219, 219, 0.6);
  border-radius: 12px;
  cursor: pointer;
}

.tools-item i {
  cursor: pointer;
}

.superdoc__tools-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
/* Tools styles - end */

/* .docx {
  border: 1px solid #dfdfdf;
  pointer-events: auto;
} */

/* 834px is iPad screen size in portrait orientation */
@media (max-width: 834px) {
  .superdoc .superdoc__layers {
    margin: 0;
    border: 0 !important;
    box-shadow: none;
  }

  .superdoc__sub-document {
    max-width: 100%;
  }

  .superdoc__right-sidebar {
    padding: 10px;
    width: 55px;
    position: relative;
  }
}
</style>
