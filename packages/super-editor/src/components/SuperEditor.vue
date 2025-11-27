<script setup lang="ts">
import { NSkeleton, useMessage } from 'naive-ui';
import 'tippy.js/dist/tippy.css';
import { ref, onMounted, onBeforeUnmount, shallowRef, reactive, markRaw, computed, watch } from 'vue';
import { Editor } from '@/index.js';
import { PresentationEditor } from '@/core/PresentationEditor.js';
import { getStarterExtensions } from '@extensions/index.js';
import SlashMenu from './slash-menu/SlashMenu.vue';
import { onMarginClickCursorChange } from './cursor-helpers.js';
import Ruler from './rulers/Ruler.vue';
import GenericPopover from './popovers/GenericPopover.vue';
import LinkInput from './toolbar/LinkInput.vue';
import TableResizeOverlay from './TableResizeOverlay.vue';
import { checkNodeSpecificClicks } from './cursor-helpers.js';
import { adjustPaginationBreaks } from './pagination-helpers.js';
import { getFileObject } from '@superdoc/common';
import BlankDOCX from '@superdoc/common/data/blank.docx?url';
import { isHeadless } from '@/utils/headless-helpers.js';
const emit = defineEmits(['editor-ready', 'editor-click', 'editor-keydown', 'comments-loaded', 'selection-update']);

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const props = defineProps({
  documentId: {
    type: String,
    required: false,
  },

  fileSource: {
    type: [File, Blob],
    required: false,
  },

  state: {
    type: Object,
    required: false,
    default: () => null,
  },

  options: {
    type: Object,
    required: false,
    default: () => ({}),
  },
});

const editorReady = ref(false);
const editor = shallowRef(null);
const activeEditor = computed(() => {
  if (editor.value && 'editor' in editor.value && editor.value.editor) {
    return editor.value.editor;
  }
  return editor.value;
});

const contextMenuDisabled = computed(() => {
  const active = activeEditor.value;
  return active?.options ? Boolean(active.options.disableContextMenu) : Boolean(props.options.disableContextMenu);
});
const message = useMessage();

const editorWrapper = ref(null);
const editorElem = ref(null);

const fileSource = ref(null);

/**
 * Generic popover controls including state, open and close functions
 */
const popoverControls = reactive({
  visible: false,
  position: { left: '0px', top: '0px' },
  component: null,
  props: {},
});

const closePopover = () => {
  popoverControls.visible = false;
  popoverControls.component = null;
  popoverControls.props = {};
  activeEditor.value?.view?.focus();
};

const openPopover = (component, props, position) => {
  popoverControls.component = component;
  popoverControls.props = props;
  popoverControls.position = position;
  popoverControls.visible = true;
};

/**
 * Table resize overlay state management
 */
const tableResizeState = reactive({
  visible: false,
  tableElement: null,
});

/**
 * Update table resize overlay visibility based on mouse position
 * Shows overlay when hovering over tables with data-table-boundaries attribute
 */
const updateTableResizeOverlay = (event) => {
  if (!editorElem.value) return;

  let target = event.target;
  // Walk up DOM tree to find table fragment or overlay
  while (target && target !== editorElem.value) {
    // Check if we're over the table resize overlay itself
    if (target.classList?.contains('superdoc-table-resize-overlay')) {
      // Keep overlay visible, don't change tableElement
      return;
    }

    if (target.classList?.contains('superdoc-table-fragment') && target.hasAttribute('data-table-boundaries')) {
      tableResizeState.visible = true;
      tableResizeState.tableElement = target;
      return;
    }
    target = target.parentElement;
  }

  // No table or overlay found - hide overlay
  tableResizeState.visible = false;
  tableResizeState.tableElement = null;
};

/**
 * Hide table resize overlay (on mouse leave)
 */
const hideTableResizeOverlay = () => {
  tableResizeState.visible = false;
  tableResizeState.tableElement = null;
};

let dataPollTimeout;

const stopPolling = () => {
  clearTimeout(dataPollTimeout);
};

const pollForMetaMapData = (ydoc, retries = 10, interval = 500) => {
  const metaMap = ydoc.getMap('meta');

  const checkData = () => {
    const docx = metaMap.get('docx');
    if (docx) {
      stopPolling();
      initEditor({ content: docx });
    } else if (retries > 0) {
      dataPollTimeout = setTimeout(checkData, interval);
      retries--;
    } else {
      console.warn('Failed to load docx data from meta map.');
    }
  };

  checkData();
};

const setDefaultBlankFile = async () => {
  fileSource.value = await getFileObject(BlankDOCX, 'blank.docx', DOCX);
};

const loadNewFileData = async () => {
  if (!fileSource.value) {
    fileSource.value = props.fileSource;
  }
  if (!fileSource.value || fileSource.value.type !== DOCX) {
    await setDefaultBlankFile();
  }

  try {
    const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(fileSource.value);
    return { content: docx, media, mediaFiles, fonts };
  } catch (err) {
    console.debug('Error loading new file data:', err);
    if (typeof props.options.onException === 'function') {
      props.options.onException({ error: err, editor: null });
    }
  }
};

const initializeData = async () => {
  // If we have the file, initialize immediately from file
  if (props.fileSource) {
    let fileData = await loadNewFileData();
    if (!fileData) {
      message.error('Unable to load the file. Please verify the .docx is valid and not password protected.');
      await setDefaultBlankFile();
      fileData = await loadNewFileData();
    }
    return initEditor(fileData);
  }

  // If we are in collaboration mode, wait for the docx data to be available
  else if (props.options.ydoc && props.options.collaborationProvider) {
    delete props.options.content;
    const ydoc = props.options.ydoc;
    const provider = props.options.collaborationProvider;
    const handleSynced = () => {
      pollForMetaMapData(ydoc);
      // Remove the synced event listener.
      // Avoids re-initializing the editor in case the connection is lost and reconnected
      provider.off('synced', handleSynced);
    };
    provider.on('synced', handleSynced);
  }
};

const getExtensions = () => getStarterExtensions();

const initEditor = async ({ content, media = {}, mediaFiles = {}, fonts = {} } = {}) => {
  const { editorCtor, ...editorOptions } = props.options || {};
  const EditorCtor = editorCtor ?? Editor;
  editor.value = new EditorCtor({
    mode: 'docx',
    element: editorElem.value,
    fileSource: fileSource.value,
    extensions: getExtensions(),
    documentId: props.documentId,
    content,
    media,
    mediaFiles,
    fonts,
    ...editorOptions,
  });

  emit('editor-ready', {
    editor: activeEditor.value,
    presentationEditor: editor.value instanceof PresentationEditor ? editor.value : null,
  });

  editor.value.on('paginationUpdate', () => {
    const base = activeEditor.value;
    if (isHeadless(base)) return;
    const paginationTarget = editor.value?.editor ? { value: base } : editor;
    adjustPaginationBreaks(editorElem, paginationTarget);
  });

  editor.value.on('collaborationReady', () => {
    setTimeout(() => {
      editorReady.value = true;
    }, 150);
  });
};

const handleSuperEditorKeydown = (event) => {
  // cmd/ctrl + opt/alt + shift + M
  if ((event.metaKey || event.ctrlKey) && event.altKey && event.shiftKey) {
    if (event.code === 'KeyM') {
      const toolbar = document.querySelector('.superdoc-toolbar');
      if (toolbar) {
        toolbar.setAttribute('tabindex', '0');
        toolbar.focus();
      }
    }
  }

  // cmd/ctrl + K → Open LinkInput popover
  if (
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey &&
    (event.key === 'k' || event.key === 'K')
  ) {
    event.preventDefault();

    const base = activeEditor.value;
    if (!base) return;

    const view = base.view;
    const { state } = view;

    // Compute cursor position relative to the super-editor container
    const container = editorWrapper.value;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const cursorCoords = view.coordsAtPos(state.selection.head);

    const left = `${cursorCoords.left - containerRect.left}px`;
    const top = `${cursorCoords.bottom - containerRect.top + 6}px`; // small offset below selection

    openPopover(markRaw(LinkInput), {}, { left, top });
  }

  emit('editor-keydown', { editor: activeEditor.value });
};

const handleSuperEditorClick = (event) => {
  emit('editor-click', { editor: activeEditor.value });
  let pmElement = editorElem.value?.querySelector('.ProseMirror');

  const base = activeEditor.value;
  if (!pmElement || !base) {
    return;
  }

  let isInsideEditor = pmElement.contains(event.target);

  if (!isInsideEditor && base.isEditable) {
    base.view?.focus();
  }

  if (isInsideEditor && base.isEditable) {
    checkNodeSpecificClicks(base, event, popoverControls);
  }

  // Update table resize overlay on click
  updateTableResizeOverlay(event);
};

onMounted(() => {
  initializeData();
  if (props.options?.suppressSkeletonLoader || !props.options?.collaborationProvider) editorReady.value = true;
});

const handleMarginClick = (event) => {
  if (event.target.classList.contains('ProseMirror')) return;

  onMarginClickCursorChange(event, activeEditor.value);
};

/**
 * Triggered when the user changes the margin value from the ruler
 *
 * @param {Object} param0
 * @param {String} param0.side - The side of the margin being changed
 * @param {Number} param0.value - The new value of the margin in inches
 * @returns {void}
 */
const handleMarginChange = ({ side, value }) => {
  const base = activeEditor.value;
  if (!base) return;

  const pageStyles = base.getPageStyles();
  const { pageMargins } = pageStyles;
  const update = { ...pageMargins, [side]: value };
  base?.updatePageStyle({ pageMargins: update });
};

onBeforeUnmount(() => {
  stopPolling();
  editor.value?.destroy();
  editor.value = null;
});
</script>

<template>
  <div class="super-editor-container">
    <Ruler
      class="ruler"
      v-if="options.rulers && !!activeEditor"
      :editor="activeEditor"
      @margin-change="handleMarginChange"
    />

    <div
      class="super-editor"
      ref="editorWrapper"
      @keydown="handleSuperEditorKeydown"
      @click="handleSuperEditorClick"
      @mousedown="handleMarginClick"
      @mousemove="updateTableResizeOverlay"
      @mouseleave="hideTableResizeOverlay"
    >
      <div ref="editorElem" class="editor-element super-editor__element" role="presentation"></div>
      <!-- Single SlashMenu component, no Teleport needed -->
      <SlashMenu
        v-if="!contextMenuDisabled && editorReady && activeEditor"
        :editor="activeEditor"
        :popoverControls="popoverControls"
        :openPopover="openPopover"
        :closePopover="closePopover"
      />
      <!-- Table resize overlay for interactive column resizing -->
      <TableResizeOverlay
        v-if="editorReady && activeEditor"
        :editor="activeEditor"
        :visible="tableResizeState.visible"
        :tableElement="tableResizeState.tableElement"
      />
    </div>

    <div class="placeholder-editor" v-if="!editorReady">
      <div class="placeholder-title">
        <n-skeleton text style="width: 60%" />
      </div>

      <n-skeleton text :repeat="6" />
      <n-skeleton text style="width: 60%" />

      <n-skeleton text :repeat="6" style="width: 30%; display: block; margin: 20px" />
      <n-skeleton text style="width: 60%" />
      <n-skeleton text :repeat="5" />
      <n-skeleton text style="width: 30%" />

      <n-skeleton text style="margin-top: 50px" />
      <n-skeleton text :repeat="6" />
      <n-skeleton text style="width: 70%" />
    </div>

    <GenericPopover
      v-if="activeEditor"
      :editor="activeEditor"
      :visible="popoverControls.visible"
      :position="popoverControls.position"
      @close="closePopover"
    >
      <component
        :is="popoverControls.component"
        v-bind="{ ...popoverControls.props, editor: activeEditor, closePopover }"
      />
    </GenericPopover>
  </div>
</template>

<style scoped>
.editor-element {
  position: relative;
}

.super-editor-container {
  width: auto;
  height: auto;
  min-width: 8in;
  min-height: 11in;
  position: relative;
  display: flex;
  flex-direction: column;
}

.ruler {
  margin-bottom: 2px;
}

.super-editor {
  color: initial;
  overflow: hidden;
}

.placeholder-editor {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  padding: 1in;
  z-index: 5;
  background-color: white;
  box-sizing: border-box;
}

.placeholder-title {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}
</style>
