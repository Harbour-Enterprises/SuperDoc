<script setup>
import 'tippy.js/dist/tippy.css';
import { NSkeleton } from 'naive-ui';
import { ref, onMounted, onBeforeUnmount, computed, shallowRef } from 'vue';
import { Editor } from '@/index.js';
import { getStarterExtensions } from '@extensions/index.js';
import { observeDomChanges } from './pagination-helpers.js';
import { onMarginClickCursorChange } from './cursor-helpers.js';

const emit = defineEmits(['editor-ready', 'editor-click', 'editor-keydown', 'comments-loaded', 'selection-update']);

const props = defineProps({
  documentId: {
    type: String,
    required: false,
  },

  fileSource: {
    type: File,
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

const editorWrapper = ref(null);
const editorElem = ref(null);
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
      console.debug(`Waiting for 'docx' data... retries left: ${retries}`);
      dataPollTimeout = setTimeout(checkData, interval); // Retry after the interval
      retries--;
    } else {
      console.warn('Failed to load docx data from meta map.');
    }
  };

  checkData();
};

const loadNewFileData = async () => {
  try {
    const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(props.fileSource);
    return { content: docx, media, mediaFiles, fonts };
  } catch (err) {
    console.debug('Error loading new file data:', err);
  }
};

const initializeData = async () => {
  // If we have the file, initialize immediately from file
  if (props.fileSource) {
    const fileData = await loadNewFileData();
    return initEditor(fileData);
  }

  // If we are in collaboration mode, wait for the docx data to be available
  else if (props.options.ydoc && props.options.collaborationProvider) {
    delete props.options.content;
    const ydoc = props.options.ydoc;
    const provider = props.options.collaborationProvider;
    provider.on('synced', () => {
      pollForMetaMapData(ydoc);
    });
  }
};

const getExtensions = () => {
  const extensions = getStarterExtensions();
  if (!props.options.pagination) {
    return extensions.filter(ext => ext.name !== 'pagination');
  }
  return extensions;
};

const initEditor = async ({ content, media = {}, mediaFiles = {}, fonts = {} } = {}) => {
  editor.value = new Editor({
    mode: 'docx',
    element: editorElem.value,
    fileSource: props.fileSource,
    extensions: getExtensions(),
    documentId: props.documentId,
    content,
    media,
    mediaFiles,
    fonts,
    users: [], // For comment @-mentions, only users that have access to the document
    ...props.options,
  });

  editor.value.on('collaborationReady', () => {
    setTimeout(() => {
      editorReady.value = true;
    }, 150);
  });
};

const handleSuperEditorKeydown = (event) => {
  emit('editor-keydown', { editor: editor.value });
};

const handleSuperEditorClick = (event) => {
  emit('editor-click', { editor: editor.value });
  let pmElement = editorElem.value?.querySelector('.ProseMirror');

  if (!pmElement || !editor.value) {
    return;
  }

  let isInsideEditor = pmElement.contains(event.target);

  if (!isInsideEditor && editor.value.isEditable) {
    editor.value.view?.focus();
  }
};

let paginationObserver;
onMounted(() => {
  // Initialize pagination observer if pagination is enabled
  if (props.options?.pagination) paginationObserver = observeDomChanges(editorWrapper, editor);

  initializeData();
  if (props.options?.suppressSkeletonLoader || !props.options?.collaborationProvider) editorReady.value = true;
});

const handleMarginClick = (event) => {
  if (event.target.classList.contains('ProseMirror')) return;

  onMarginClickCursorChange(event, editor.value);
};

onBeforeUnmount(() => {
  paginationObserver?.disconnect();
  stopPolling();
  editor.value?.destroy();
  editor.value = null;
});
</script>

<template>
  <div class="super-editor-container">
    <div 
      class="super-editor"
      ref="editorWrapper"
      @keydown="handleSuperEditorKeydown" 
      @click="handleSuperEditorClick"
      @mousedown="handleMarginClick"
    >
      <div ref="editorElem" class="editor-element super-editor__element"></div>
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
  </div>
</template>

<style scoped>
.super-editor-container {
  width: auto;
  height: auto;
  min-width: 8in;
  min-height: 11in;
  position: relative;
}

.super-editor {
  color: initial;
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
