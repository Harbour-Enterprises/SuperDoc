<script setup>
import '@harbour-enterprises/common/styles/common-styles.css';
import '@harbour-enterprises/super-editor/style.css';

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
import { SuperEditor, AIWriter } from '@harbour-enterprises/super-editor';
import HtmlViewer from './components/HtmlViewer/HtmlViewer.vue';
import useComment from './components/CommentsLayer/use-comment';
import AiLayer from './components/AiLayer/AiLayer.vue';
import { useSelectedText } from './composables/use-selected-text';
import { useAi } from './composables/use-ai';
import { useHighContrastMode } from './composables/use-high-contrast-mode';

// Stores
const superdocStore = useSuperdocStore();
const commentsStore = useCommentsStore();
const emit = defineEmits(['selection-update']);

// Canvas variables
let canvasEventListeners = null;
let canvas = null;

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
  generalCommentIds,
  getFloatingComments,
  hasSyncedCollaborationComments,
  editorCommentPositions,
  hasInitializedLocations,
} = storeToRefs(commentsStore);
const { showAddComment, handleEditorLocationsUpdate, handleTrackedChangeUpdate } = commentsStore;
const { proxy } = getCurrentInstance();
commentsStore.proxy = proxy;

const showCanvas = ref(false);

const { isHighContrastMode } = useHighContrastMode();

// Refs
const layers = ref(null);

// Comments layer
const commentsLayer = ref(null);
const toolsMenuPosition = reactive({ top: null, right: '-25px', zIndex: 101 });

// Create a ref to pass to the composable
const activeEditorRef = computed(() => proxy.$superdoc.activeEditor);

// Use the composable to get the selected text
const { selectedText } = useSelectedText(activeEditorRef);

// Use the AI composable
const {
  showAiLayer,
  showAiWriter,
  aiWriterPosition,
  aiLayer,
  initAiLayer,
  showAiWriterAtCursor,
  handleAiWriterClose,
  handleAiToolClick,
} = useAi({
  activeEditorRef,
});

// Hrbr Fields
const hrbrFieldsLayer = ref(null);

const handleDocumentReady = (documentId, container) => {
  const doc = getDocument(documentId);
  doc.isReady = true;
  doc.container = container;
  if (areDocumentsReady.value) {
    if (!proxy.$superdoc.config.collaboration) isReady.value = true;
  }

  isFloatingCommentsReady.value = true;
  hasInitializedLocations.value = true;
  proxy.$superdoc.broadcastPdfDocumentReady();
};

const handleToolClick = (tool) => {
  const toolOptions = {
    comments: () => showAddComment(proxy.$superdoc),
    ai: () => handleAiToolClick(),
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
  commentsStore.removePendingComment(proxy.$superdoc);
};

const onCommentsLoaded = ({ editor, comments, replacedFile }) => {
  if (editor.options.shouldLoadComments || replacedFile) {
    nextTick(() => {
      commentsStore.processLoadedDocxComments({
        superdoc: proxy.$superdoc,
        editor,
        comments,
        documentId: editor.options.documentId,
      });
    });
  }
};

const onEditorBeforeCreate = ({ editor }) => {
  proxy.$superdoc?.broadcastEditorBeforeCreate(editor);
};

const onEditorCreate = ({ editor }) => {
  const { documentId } = editor.options;
  const doc = getDocument(documentId);
  doc.setEditor(editor);
  proxy.$superdoc.setActiveEditor(editor);
  proxy.$superdoc.broadcastEditorCreate(editor);
  // Initialize the ai layer
  initAiLayer(true);
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

const onEditorUpdate = ({ editor }) => {
  proxy.$superdoc.emit('editor-update', { editor });
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
  const HEADER_HEIGHT = 96;
  // Ensure the selection is not placed at the top of the page
  const top = Math.max(HEADER_HEIGHT, fromCoords.top - layerBounds.top);
  const bottom = toCoords.bottom - layerBounds.top;
  const selectionBounds = {
    top,
    left: fromCoords.left,
    right: toCoords.left,
    bottom,
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
    isReady.value = true;

    const urlParams = new URLSearchParams(window.location.search);
    const commentId = urlParams.get('commentId');
    if (commentId) scrollToComment(commentId);
  });
};

const onEditorContentError = ({ error, editor }) => {
  proxy.$superdoc.emit('content-error', { error, editor });
};

const onEditorException = ({ error, editor }) => {
  proxy.$superdoc.emit('exception', { error, editor });
};

const onEditorListdefinitionsChange = (params) => {
  proxy.$superdoc.emit('list-definitions-change', params);
};

const editorOptions = (doc) => {
  const options = {
    pagination: proxy.$superdoc.config.pagination,
    documentId: doc.id,
    user: proxy.$superdoc.user,
    users: proxy.$superdoc.users,
    colors: proxy.$superdoc.colors,
    role: proxy.$superdoc.config.role,
    html: doc.html,
    documentMode: proxy.$superdoc.config.documentMode,
    rulers: doc.rulers,
    isInternal: proxy.$superdoc.config.isInternal,
    annotations: proxy.$superdoc.config.annotations,
    isCommentsEnabled: proxy.$superdoc.config.modules?.comments,
    isAiEnabled: proxy.$superdoc.config.modules?.ai,
    onBeforeCreate: onEditorBeforeCreate,
    onCreate: onEditorCreate,
    onDestroy: onEditorDestroy,
    onFocus: onEditorFocus,
    onDocumentLocked: onEditorDocumentLocked,
    onUpdate: onEditorUpdate,
    onSelectionUpdate: onEditorSelectionChange,
    onCollaborationReady: onEditorCollaborationReady,
    onContentError: onEditorContentError,
    onException: onEditorException,
    onCommentsLoaded,
    onCommentsUpdate: onEditorCommentsUpdate,
    onCommentLocationsUpdate: onEditorCommentLocationsUpdate,
    onListDefinitionsChange: onEditorListdefinitionsChange,
    ydoc: doc.ydoc,
    collaborationProvider: doc.provider || null,
    isNewFile: doc.isNewFile || false,
    handleImageUpload: proxy.$superdoc.config.handleImageUpload,
    telemetry: proxy.$superdoc.telemetry,
    externalExtensions: proxy.$superdoc.config.editorExtensions || [],
    suppressDefaultDocxStyles: proxy.$superdoc.config.suppressDefaultDocxStyles,
    disableContextMenu: proxy.$superdoc.config.disableContextMenu,
    jsonOverride: proxy.$superdoc.config.jsonOverride,
  };

  return options;
};

/**
 * Trigger a comment-positions location update
 * This is called when the editor has updated the comment locations
 *
 * @returns {void}
 */
const onEditorCommentLocationsUpdate = ({ allCommentIds: activeThreadId, allCommentPositions }) => {
  if (!proxy.$superdoc.config.modules?.comments) return;
  handleEditorLocationsUpdate(allCommentPositions, activeThreadId);
};

const onEditorCommentsUpdate = (params = {}) => {
  // Set the active comment in the store
  const { activeCommentId, type } = params;

  if (type === 'trackedChange') {
    handleTrackedChangeUpdate({ superdoc: proxy.$superdoc, params });
  }

  nextTick(() => {
    if (pendingComment.value) return;
    commentsStore.setActiveComment(proxy.$superdoc, activeCommentId);
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
    (getFloatingComments.value?.length > 0 &&
      isReady.value &&
      layers.value &&
      isCommentsEnabled.value &&
      !isCommentsListVisible.value)
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

/**
 * Scroll the page to a given commentId
 *
 * @param {String} commentId The commentId to scroll to
 */
const scrollToComment = (commentId) => {
  if (!proxy.$superdoc.config?.modules?.comments) return;

  const element = document.querySelector(`[data-thread-id=${commentId}]`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    commentsStore.setActiveComment(proxy.$superdoc, commentId);
  }
};

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

  resetSelection();

  const isMobileView = window.matchMedia('(max-width: 768px)').matches;

  updateSelection({
    startX: selection.selectionBounds.left,
    startY: selection.selectionBounds.top,
    x: selection.selectionBounds.right,
    y: selection.selectionBounds.bottom,
    source: selection.source,
  });

  if (!selectionPosition.value) return;
  const selectionIsWideEnough = Math.abs(selectionPosition.value.left - selectionPosition.value.right) > 5;
  const selectionIsTallEnough = Math.abs(selectionPosition.value.top - selectionPosition.value.bottom) > 5;
  if (!selectionIsWideEnough || !selectionIsTallEnough) {
    selectionLayer.value.style.pointerEvents = 'none';
    resetSelection();
    return;
  }

  activeSelection.value = selection;

  // Place the tools menu at the level of the selection
  let top = selection.selectionBounds.top;
  toolsMenuPosition.top = top + 'px';
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
    const y = e.offsetY / (activeZoom.value / 100);
    const x = e.offsetX / (activeZoom.value / 100);
    updateSelection({ startX: x, startY: y });
    selectionLayer.value.addEventListener('mousemove', handleDragMove);
  });
};

const handleDragMove = (e) => {
  if (!isDragging.value) return;
  const y = e.offsetY / (activeZoom.value / 100);
  const x = e.offsetX / (activeZoom.value / 100);
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

const shouldShowSelection = computed(() => {
  const config = proxy.$superdoc.config.modules?.comments;
  return !config.readOnly;
});

const handleSuperEditorPageMarginsChange = (doc, params) => {
  doc.documentMarginsLastChange = params.pageMargins;
};

const handlePdfClick = (e) => {
  if (!isCommentsEnabled.value) return;
  resetSelection();
  isDragging.value = true;
  handleSelectionStart(e);
};

const initCanvas = () => {
  // Wait a bit for the DOM to fully settle
  setTimeout(() => {
    // 1. Create canvas
    canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '9999';
    canvas.id = 'overlay-canvas';

    const container = document.getElementById('canvas-container');
    if (!container) {
      console.error('Canvas container not found!');
      return;
    }

    // Clear any existing canvas
    const existingCanvas = container.querySelector('#overlay-canvas');
    if (existingCanvas) {
      existingCanvas.remove();
    }

    container.appendChild(canvas);

    // Set proper canvas resolution
    const containerStyle = window.getComputedStyle(container);
    const containerWidth = parseInt(containerStyle.width);
    const containerHeight = parseInt(containerStyle.height);

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    // Create event handlers object to store references
    canvasEventListeners = createCanvasEventHandlers(canvas, ctx, container);

    // Apply event listeners based on showCanvas state
    updateCanvasInteractivity();
  }, 500);
};

// Separate function to create all event handlers
const createCanvasEventHandlers = (canvas, ctx, container) => {
  const getCanvasCoordinates = (e) => {
    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    return {
      x: x * scaleX,
      y: y * scaleY,
      displayX: x,
      displayY: y,
    };
  };

  const drawCommentOnCanvas = (ctx, commentText, x, y) => {
    ctx.save();

    // Set up text properties
    const fontSize = 12;
    const padding = 10;
    const lineHeight = fontSize * 1.4;
    const maxWidth = 180;

    ctx.font = `${fontSize}px Arial, sans-serif`;

    // Word wrap the comment text
    const words = commentText.split(' ');
    const lines = [];
    let currentLine = '';

    for (let word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Calculate bubble dimensions
    const lineWidths = lines.map((line) => ctx.measureText(line).width);
    const actualMaxWidth = Math.max(...lineWidths);
    const bubbleWidth = actualMaxWidth + padding * 2;
    const bubbleHeight = lines.length * lineHeight + padding * 2;

    // Position bubble
    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y - bubbleHeight - 13;
    const cornerRadius = 6;

    // Draw comment bubble
    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.15;

    // Rounded rectangle
    ctx.beginPath();
    ctx.moveTo(bubbleX + cornerRadius, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth - cornerRadius, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + cornerRadius);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - cornerRadius);
    ctx.quadraticCurveTo(
      bubbleX + bubbleWidth,
      bubbleY + bubbleHeight,
      bubbleX + bubbleWidth - cornerRadius,
      bubbleY + bubbleHeight,
    );
    ctx.lineTo(bubbleX + cornerRadius, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - cornerRadius);
    ctx.lineTo(bubbleX, bubbleY + cornerRadius);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + cornerRadius, bubbleY);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Draw tail
    const tailSize = 8;
    const tailX = Math.min(Math.max(x, bubbleX + 10), bubbleX + bubbleWidth - 10);
    const tailY = bubbleY + bubbleHeight;

    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY + tailSize);
    ctx.lineTo(tailX - tailSize / 2, tailY);
    ctx.lineTo(tailX + tailSize / 2, tailY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = '#92400E';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    lines.forEach((line, index) => {
      const textX = bubbleX + padding;
      const textY = bubbleY + padding + index * lineHeight;
      ctx.fillText(line, textX, textY);
    });

    ctx.restore();
  };

  const drawStickerOnCanvas = (ctx, stickerType, x, y) => {
    const size = 40;
    const radius = size / 2;

    ctx.save();

    switch (stickerType) {
      case 'check-mark':
        // Green circle with checkmark
        ctx.fillStyle = '#22C55E';
        ctx.strokeStyle = '#16A34A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // White checkmark
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x - 2, y + 6);
        ctx.lineTo(x + 8, y - 6);
        ctx.stroke();
        break;

      case 'nice':
        // Blue circle with smiley
        ctx.fillStyle = '#3B82F6';
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // White smiley face
        ctx.fillStyle = 'white';
        // Eyes
        ctx.beginPath();
        ctx.arc(x - 6, y - 4, 2, 0, 2 * Math.PI);
        ctx.arc(x + 6, y - 4, 2, 0, 2 * Math.PI);
        ctx.fill();

        // Smile
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y + 2, 8, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        break;

      case 'needs-improvement':
        // Orange circle with exclamation
        ctx.fillStyle = '#F59E0B';
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // White exclamation mark
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        // Exclamation line
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 2);
        ctx.stroke();

        // Exclamation dot
        ctx.beginPath();
        ctx.arc(x, y + 8, 2, 0, 2 * Math.PI);
        ctx.fill();
        break;

      default:
        // Fallback gray circle
        ctx.fillStyle = '#9CA3AF';
        ctx.beginPath();
        ctx.arc(x, y, radius - 2, 0, 2 * Math.PI);
        ctx.fill();
        break;
    }

    ctx.restore();
  };

  const createTextInput = (displayX, displayY, canvasX, canvasY) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.style.position = 'absolute';
    input.style.left = displayX + 'px';
    input.style.top = displayY + 'px';
    input.style.zIndex = '10000';
    input.style.background = 'transparent';
    input.style.outline = 'none';
    input.style.fontSize = '16px';
    input.style.fontFamily = 'Arial, sans-serif';
    input.style.color = '#000';
    input.style.minWidth = '100px';
    input.style.padding = '2px 4px';
    input.style.border = '1px solid #DBDBDB';
    input.style.borderRadius = '4px';

    container.appendChild(input);
    input.focus();

    const finishTextInput = () => {
      const text = input.value.trim();
      if (text) {
        drawCommentOnCanvas(ctx, text, canvasX + 10, canvasY + 30);
      }
      container.removeChild(input);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        finishTextInput();
      }
    });

    input.addEventListener('blur', finishTextInput);
  };

  // Drawing state
  let isMouseDown = false;
  let hasDragged = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  const dragThreshold = 3;

  // Event handlers
  const onMouseDown = (e) => {
    console.log('Mouse down detected');
    e.preventDefault();
    e.stopPropagation();

    const coords = getCanvasCoordinates(e);

    isMouseDown = true;
    hasDragged = false;
    startX = coords.x;
    startY = coords.y;
    lastX = coords.x;
    lastY = coords.y;
  };

  const onMouseMove = (e) => {
    if (!isMouseDown) return;

    e.preventDefault();
    e.stopPropagation();

    const coords = getCanvasCoordinates(e);

    const deltaX = Math.abs(coords.x - startX);
    const deltaY = Math.abs(coords.y - startY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > dragThreshold && !hasDragged) {
      hasDragged = true;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
    }

    if (hasDragged) {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();

      lastX = coords.x;
      lastY = coords.y;
    }
  };

  const onMouseUp = (e) => {
    if (!isMouseDown) return;

    if (!hasDragged) {
      const coords = getCanvasCoordinates(e);
      createTextInput(coords.displayX, coords.displayY, coords.x, coords.y);
    } else {
      ctx.closePath();
    }

    isMouseDown = false;
    hasDragged = false;
  };

  const onMouseLeave = (e) => {
    if (isMouseDown && hasDragged) {
      ctx.closePath();
    }
    isMouseDown = false;
    hasDragged = false;
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    canvas.style.border = '2px solid #22C55E';
  };

  const handleDragLeave = (e) => {
    if (!canvas.contains(e.relatedTarget)) {
      canvas.style.border = 'none';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    canvas.style.border = 'none';

    const coords = getCanvasCoordinates(e);

    // Handle sticker drops
    const stickerData = e.dataTransfer.getData('application/sticker');
    if (stickerData) {
      try {
        const sticker = JSON.parse(stickerData);
        drawStickerOnCanvas(ctx, sticker.type, coords.x, coords.y);
        return;
      } catch (error) {
        console.error('Error handling sticker drop:', error);
      }
    }

    // Handle comment drops
    const commentData = e.dataTransfer.getData('application/comment');
    if (commentData) {
      try {
        const comment = JSON.parse(commentData);
        drawCommentOnCanvas(ctx, comment.text, coords.x, coords.y + 40);
        return;
      } catch (error) {
        console.error('Error handling comment drop:', error);
      }
    }

    // Fallback for plain text
    const plainText = e.dataTransfer.getData('text/plain');
    if (plainText) {
      if (['check-mark', 'nice', 'needs-improvement'].includes(plainText)) {
        drawStickerOnCanvas(ctx, plainText, coords.x, coords.y);
      } else {
        drawCommentOnCanvas(ctx, plainText, coords.x, coords.y - 20);
      }
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  const handleClick = (e) => {
    console.log('Canvas clicked!', e);
    e.stopPropagation();
  };

  // Return event handlers
  return {
    mouse: {
      mousedown: { handler: onMouseDown, options: true },
      mousemove: { handler: onMouseMove, options: true },
      mouseup: { handler: onMouseUp, options: true },
      mouseleave: { handler: onMouseLeave, options: true },
      click: { handler: handleClick, options: true },
    },
    dragDrop: {
      dragover: { handler: handleDragOver, options: false },
      dragenter: { handler: handleDragEnter, options: false },
      dragleave: { handler: handleDragLeave, options: false },
      drop: { handler: handleDrop, options: false },
    },
    other: {
      contextmenu: { handler: handleContextMenu, options: false },
    },
  };
};

// Function to add or remove event listeners based on showCanvas state
const updateCanvasInteractivity = () => {
  if (!canvas || !canvasEventListeners) return;

  if (showCanvas.value) {
    // Enable canvas interactivity
    canvas.style.pointerEvents = 'auto';
    canvas.style.cursor = 'crosshair';

    // Add all event listeners
    Object.values(canvasEventListeners).forEach((category) => {
      Object.entries(category).forEach(([eventName, { handler, options }]) => {
        canvas.addEventListener(eventName, handler, options);
      });
    });

    console.log('Canvas interactivity enabled');
  } else {
    // Disable canvas interactivity
    canvas.style.pointerEvents = 'none';
    canvas.style.cursor = 'default';

    // Remove all event listeners
    Object.values(canvasEventListeners).forEach((category) => {
      Object.entries(category).forEach(([eventName, { handler, options }]) => {
        canvas.removeEventListener(eventName, handler, options);
      });
    });

    console.log('Canvas interactivity disabled');
  }
};

// Watch for showCanvas changes and update interactivity
watch(showCanvas, (newValue) => {
  console.log('showCanvas changed to:', newValue);
  updateCanvasInteractivity();
});

onMounted(() => {
  if (isCommentsEnabled.value && !modules.comments.readOnly) {
    document.addEventListener('mousedown', handleDocumentMouseDown);
  }

  // Always create the canvas on mount, but start disabled
  initCanvas();

  proxy.$superdoc.on('canvas', (canvasEnabled) => {
    showCanvas.value = canvasEnabled;
    console.debug('--SHOW CANVAS', canvasEnabled);
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentMouseDown);

  // Clean up canvas event listeners
  if (canvas && canvasEventListeners) {
    Object.values(canvasEventListeners).forEach((category) => {
      Object.entries(category).forEach(([eventName, { handler, options }]) => {
        canvas.removeEventListener(eventName, handler, options);
      });
    });
  }
});

watch(getFloatingComments, () => {
  hasInitializedLocations.value = false;
  nextTick(() => {
    hasInitializedLocations.value = true;
  });
});
</script>

<template>
  <div class="superdoc" :class="{ 'superdoc--with-sidebar': showCommentsSidebar, 'high-contrast': isHighContrastMode }">
    <div class="superdoc__layers layers" ref="layers" role="group">
      <!-- Floating tools menu (shows up when user has text selection)-->
      <div v-if="showToolsFloatingMenu" class="superdoc__tools tools" :style="toolsMenuPosition">
        <div class="tools-item" data-id="is-tool" @mousedown.stop.prevent="handleToolClick('comments')">
          <div class="superdoc__tools-icon" v-html="superdocIcons.comment"></div>
        </div>
        <!-- AI tool button -->
        <div
          v-if="proxy.$superdoc.config.modules.ai"
          class="tools-item"
          data-id="is-tool"
          @mousedown.stop.prevent="handleToolClick('ai')"
        >
          <div class="superdoc__tools-icon ai-tool"></div>
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
            v-if="selectionPosition && shouldShowSelection"
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
        <CommentsLayer
          v-if="layers"
          class="superdoc__comments-layer comments-layer"
          style="z-index: 3"
          ref="commentsLayer"
          :parent="layers"
          :user="user"
          @highlight-click="handleHighlightClick"
        />

        <!-- AI Layer for temporary highlights -->
        <AiLayer
          v-if="showAiLayer"
          class="ai-layer"
          style="z-index: 4"
          ref="aiLayer"
          :editor="proxy.$superdoc.activeEditor"
        />

        <div class="free-annotations comments-layer" :class="{ 'free-annotations--hidden': !showCanvas }">
          <div id="canvas-container"></div>
        </div>

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

      <div class="floating-comments">
        <FloatingComments
          v-if="hasInitializedLocations && getFloatingComments.length > 0"
          v-for="doc in documentsWithConverations"
          :parent="layers"
          :current-document="doc"
        />
      </div>
    </div>

    <!-- AI Writer at cursor position -->
    <div class="ai-writer-container" v-if="showAiWriter" :style="aiWriterPosition">
      <AIWriter
        :selected-text="selectedText"
        :handle-close="handleAiWriterClose"
        :editor="proxy.$superdoc.activeEditor"
        :api-key="proxy.$superdoc.toolbar?.config?.aiApiKey"
        :endpoint="proxy.$superdoc.config?.modules?.ai?.endpoint"
      />
    </div>
  </div>
</template>

<style>
.superdoc {
  &.high-contrast {
    border-color: #000;

    .super-editor {
      border-color: #000;

      &:focus-within {
        border-color: blue;
      }
    }
  }

  .super-editor {
    border-radius: 8px;
    border: 1px solid #d3d3d3;
    box-shadow: 0 0 5px hsla(0, 0%, 0%, 0.05);
  }
}
</style>

<style scoped>
.free-annotations--hidden {
  pointer-events: none !important;
  opacity: 0.3;
}

.free-annotations--hidden canvas {
  pointer-events: none !important;
  cursor: default !important;
}

.free-annotations {
  position: absolute;
  width: 100%;
  min-height: 11in;
  z-index: 10;
  transition: opacity 0.2s ease;
}

.superdoc {
  display: flex;
}

.right-sidebar {
  min-width: 320px;
}

.floating-comments {
  min-width: 300px;
  width: 300px;
}

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
  top: 0;
  height: 100%;
  position: relative;
}

.superdoc__right-sidebar {
  width: 320px;
  min-width: 320px;
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
  flex-direction: column;
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
  position: relative;
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

.ai-tool > svg {
  fill: transparent;
}

.ai-tool::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  z-index: 1;
  background: linear-gradient(
    270deg,
    rgba(218, 215, 118, 0.5) -20%,
    rgba(191, 100, 100, 1) 30%,
    rgba(77, 82, 217, 1) 60%,
    rgb(255, 219, 102) 150%
  );
  -webkit-mask: url("data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path d='M224 96l16-32 32-16-32-16-16-32-16 32-32 16 32 16 16 32zM80 160l26.7-53.3L160 80l-53.3-26.7L80 0 53.3 53.3 0 80l53.3 26.7L80 160zm352 128l-26.7 53.3L352 368l53.3 26.7L432 448l26.7-53.3L512 368l-53.3-26.7L432 288zm70.6-193.8L417.8 9.4C411.5 3.1 403.3 0 395.2 0c-8.2 0-16.4 3.1-22.6 9.4L9.4 372.5c-12.5 12.5-12.5 32.8 0 45.3l84.9 84.9c6.3 6.3 14.4 9.4 22.6 9.4 8.2 0 16.4-3.1 22.6-9.4l363.1-363.2c12.5-12.5 12.5-32.8 0-45.2zM359.5 203.5l-50.9-50.9 86.6-86.6 50.9 50.9-86.6 86.6z'/></svg>")
    center / contain no-repeat;
  mask: url("data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path d='M224 96l16-32 32-16-32-16-16-32-16 32-32 16 32 16 16 32zM80 160l26.7-53.3L160 80l-53.3-26.7L80 0 53.3 53.3 0 80l53.3 26.7L80 160zm352 128l-26.7 53.3L352 368l53.3 26.7L432 448l26.7-53.3L512 368l-53.3-26.7L432 288zm70.6-193.8L417.8 9.4C411.5 3.1 403.3 0 395.2 0c-8.2 0-16.4 3.1-22.6 9.4L9.4 372.5c-12.5 12.5-12.5 32.8 0 45.3l84.9 84.9c6.3 6.3 14.4 9.4 22.6 9.4 8.2 0 16.4-3.1 22.6-9.4l363.1-363.2c12.5-12.5 12.5-32.8 0-45.2zM359.5 203.5l-50.9-50.9 86.6-86.6 50.9 50.9-86.6 86.6z'/></svg>")
    center / contain no-repeat;
  filter: brightness(1.2);
  transition: filter 0.2s ease;
}

.ai-tool:hover::before {
  filter: brightness(1.3);
}

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

/* AI Writer styles */
.ai-writer-container {
  position: fixed;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

#canvas-container {
  position: absolute;
  z-index: 1000;
  top: 0;
  width: 8.5in;
  height: 11in;
  pointer-events: none;
}

#canvas-container canvas {
  cursor: crosshair;
  pointer-events: auto;
}
</style>
