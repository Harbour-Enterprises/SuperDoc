<script setup>
import '@/style.css';
import '@harbour-enterprises/common/styles/common-styles.css';

import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue';
import { NMessageProvider } from 'naive-ui';
import { SuperEditor } from '@/index.js';
import { getFileObject } from '@harbour-enterprises/common/helpers/get-file-object';
import { DOCX } from '@harbour-enterprises/common';
import { SuperToolbar } from '@components/toolbar/super-toolbar';
import { PaginationPluginKey } from '@extensions/pagination/pagination-helpers.js';
import BasicUpload from './BasicUpload.vue';
import BlankDOCX from '@harbour-enterprises/common/data/blank.docx?url';
import { Telemetry } from '@harbour-enterprises/common/Telemetry.js';
import { useAutocomplete, getAutocompleteEndpoint } from '@/composables/use-autocomplete.js';

// Import the component the same you would in your app
let activeEditor;
const currentFile = ref(null);
const pageStyles = ref(null);
const isDebuggingPagination = ref(false);
const telemetry = shallowRef(null);

// Content injection variables
const contentInput = ref('');
const contentType = ref('html');
const isInjectingContent = ref(false);

// Autocomplete configuration
const autocompleteEndpoint = ref(getAutocompleteEndpoint());
const useAutocompleteFeature = ref(false);

// Initialize autocomplete composable
const {
  ghostText,
  isGhostTextActive,
  autocompleteStatus,
  initializeAutocomplete,
  cleanup: cleanupAutocomplete,
} = useAutocomplete();

const handleNewFile = async (file) => {
  currentFile.value = null;
  const fileUrl = URL.createObjectURL(file);
  currentFile.value = await getFileObject(fileUrl, file.name, file.type);
};

// API call function for autocomplete
function buildAutocompleteApiCall(endpoint) {
  return async function (inputText) {
    if (!endpoint) throw new Error('No autocomplete API endpoint set.');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: inputText }),
    });
    if (!res.ok) throw new Error('Autocomplete API error: ' + res.status);
    const data = await res.json();
    return data.completion || data.text || inputText;
  };
}
const callAutocompleteAPIFunction = buildAutocompleteApiCall(autocompleteEndpoint.value);

const onCreate = ({ editor }) => {
  console.debug('[Dev] Editor created', editor);
  console.debug('[Dev] Page styles (pixels)', editor.getPageStyles());
  console.debug('[Dev] document styles', editor.converter?.getDocumentDefaultStyles());

  pageStyles.value = editor.converter?.pageStyles;
  activeEditor = editor;
  window.editor = editor;

  editor.setToolbar(initToolbar());
  editor.toolbar.on('superdoc-command', ({ item, argument }) => {
    const { command } = item;
    if (command === 'setDocumentMode') {
      editor.setDocumentMode(argument);
    }
  });
  attachAnnotationEventHandlers();

  // Initialize autocomplete with the editor
  initializeAutocomplete(editor, {
    apiCallFunction: callAutocompleteAPIFunction,
    enabled: useAutocompleteFeature,
  });

  // Set debugging pagination value from editor plugin state
  isDebuggingPagination.value = PaginationPluginKey.getState(editor.state)?.isDebugging;

  // editor.commands.addFieldAnnotation(0, {
  //   type: 'text',
  //   displayLabel: 'Some text',
  //   fieldId: '123',
  //   fieldType: 'TEXTINPUT',
  //   fieldColor: '#980043',
  // });
};

const onCommentClicked = ({ conversation }) => {
  console.debug('💬 [Dev] Comment active', conversation);
};

const user = {
  name: 'Developer playground',
  email: 'devs@harbourshare.com',
};

const editorOptions = computed(() => {
  return {
    documentId: 'dev-123',
    user,
    rulers: true,
    onCreate,
    onCommentClicked,
    onCommentsLoaded,
    suppressSkeletonLoader: true,
    users: [], // For comment @-mentions, only users that have access to the document
    pagination: true,
    telemetry: telemetry.value,
    annotations: true,
  };
});

const onCommentsLoaded = ({ comments }) => {
  console.debug('💬 [Dev] Comments loaded', comments);
};

const exportDocx = async () => {
  const result = await activeEditor?.exportDocx();
  const blob = new Blob([result], { type: DOCX });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'exported.docx';
  a.click();
};

const attachAnnotationEventHandlers = () => {
  activeEditor?.on('fieldAnnotationClicked', (params) => {
    console.log('fieldAnnotationClicked', { params });
  });

  activeEditor?.on('fieldAnnotationSelected', (params) => {
    console.log('fieldAnnotationSelected', { params });
  });

  activeEditor?.on('fieldAnnotationDeleted', (params) => {
    console.log('fieldAnnotationDeleted', { params });
  });
};

const initToolbar = () => {
  return new SuperToolbar({ element: 'toolbar', editor: activeEditor, isDev: true, pagination: true });
};

/* For pagination debugging / visual cues */
const debugPageStyle = computed(() => {
  return {
    height: pageStyles.value?.pageSize.height + 'in',
  };
});

const callAutocompleteAPI = async (inputText) => {
  if (!autocompleteEndpoint.value) {
    throw new Error('Autocomplete endpoint not configured');
  }

  autocompleteStatus.value = 'Calling autocomplete API...';

  try {
    const response = await fetch(autocompleteEndpoint.value, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: inputText,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    autocompleteStatus.value = 'Autocomplete completed';

    // Extract the "completion" key from the response
    return data.completion || data.text || inputText; // fallback to original if no completion
  } catch (error) {
    autocompleteStatus.value = `Autocomplete failed: ${error.message}`;
    console.error('[Dev] Autocomplete API error:', error);
    throw error;
  }
};
const injectContent = async () => {
  if (!activeEditor || !contentInput.value.trim()) {
    console.warn('[Dev] No editor instance or empty content');
    return;
  }

  try {
    isInjectingContent.value = true;
    autocompleteStatus.value = '';
    let contentToInsert = contentInput.value;

    // If autocomplete is enabled, call the API first
    if (useAutocompleteFeature.value) {
      console.debug('[Dev] Calling autocomplete API with text:', contentInput.value);
      contentToInsert = await callAutocompleteAPI(contentInput.value);
      console.debug('[Dev] Autocomplete response:', contentToInsert);
    }

    // Insert the content (either original or autocompleted)
    activeEditor.commands.insertContent(contentToInsert, {
      contentType: contentType.value,
    });

    console.debug(`[Dev] ${contentType.value} content injected successfully`);
    contentInput.value = '';
    autocompleteStatus.value = '';
  } catch (error) {
    console.error('[Dev] Failed to inject content:', error);
    autocompleteStatus.value = `Error: ${error.message}`;
  } finally {
    isInjectingContent.value = false;
  }
};

onMounted(async () => {
  // set document to blank
  currentFile.value = await getFileObject(BlankDOCX, 'blank_document.docx', DOCX);

  telemetry.value = new Telemetry({
    enabled: false,
    superdocId: 'dev-playground',
  });

  // === Listen for production toolbar autocomplete event and sync to dev toggle ===
  setTimeout(() => {
    const toolbarElem = document.querySelector('.sd-toolbar');
    if (toolbarElem && toolbarElem.__vue_app__) {
      const toolbarVm = toolbarElem.__vue_app__._instance?.proxy?.$toolbar;
      if (toolbarVm && toolbarVm.on) {
        toolbarVm.on('toggle-autocomplete', ({ enabled }) => {
          useAutocompleteFeature.value = enabled;
          if (!activeEditor) return;
          if (!enabled) {
            cleanupAutocomplete();
          }
          // No need to re-init, the composable will watch the ref via enabled
        });
      }
    }
  }, 300);
});

onBeforeUnmount(() => {
  // Cleanup autocomplete when component unmounts
  cleanupAutocomplete();
});
</script>

<template>
  <div class="dev-app">
    <div class="dev-app__layout">
      <div class="dev-app__header">
        <div class="dev-app__header-side dev-app__header-side--left">
          <div class="dev-app__header-title">
            <h2>Super Editor Dev Area</h2>
          </div>
          <div class="dev-app__header-upload">
            Upload docx
            <BasicUpload @file-change="handleNewFile" />
          </div>
        </div>
        <div class="dev-app__header-side dev-app__header-side--right">
          <div class="dev-app__content-injection">
            <div class="dev-app__content-controls">
              <select v-model="contentType" class="dev-app__content-type">
                <option value="html">HTML</option>
                <option value="markdown">Markdown</option>
                <option value="text">Text</option>
              </select>

              <label class="dev-app__autocomplete-toggle">
                <button
                  class="dev-app__autocomplete-wand"
                  :class="{ active: useAutocompleteFeature }"
                  @click="useAutocompleteFeature = !useAutocompleteFeature"
                  title="Toggle Autocomplete"
                  type="button"
                  style="background: none; border: none; padding: 0; cursor: pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 -960 960 960">
                    <path
                      d="m480-280-62-138-138-62 138-63 62-137 63 137 137 63-137 62-63 138Zm0 240q-108 0-202.5-49.5T120-228v108H40v-240h240v80h-98q51 75 129.5 117.5T480-120q115 0 208.5-66T820-361l78 18q-45 136-160 219.5T480-40ZM42-520q7-67 32-128.5T143-762l57 57q-32 41-52 87.5T123-520H42Zm214-241-57-57q53-44 114-69.5T440-918v80q-51 5-97 25t-87 52Zm449 0q-41-32-87.5-52T520-838v-80q67 6 128.5 31T762-818l-57 57Zm133 241q-5-51-25-97.5T761-705l57-57q44 52 69 113.5T918-520h-80Z"
                    />
                  </svg>
                </button>
                <span>Autocomplete</span>
              </label>

              <button
                class="dev-app__inject-btn"
                @click="injectContent"
                :disabled="isInjectingContent || !contentInput.trim()"
              >
                {{
                  isInjectingContent
                    ? 'Processing...'
                    : useAutocompleteFeature
                      ? 'Autocomplete & Inject'
                      : 'Inject Content'
                }}
              </button>
            </div>

            <input
              v-if="useAutocompleteFeature"
              v-model="autocompleteEndpoint"
              class="dev-app__autocomplete-endpoint"
              placeholder="Autocomplete API endpoint..."
              type="url"
            />

            <div v-if="autocompleteStatus" class="dev-app__autocomplete-status">
              {{ autocompleteStatus }}
            </div>

            <textarea
              v-model="contentInput"
              class="dev-app__content-input"
              :placeholder="useAutocompleteFeature ? 'Enter prompt for autocomplete...' : 'Enter content to inject...'"
              rows="3"
            ></textarea>
          </div>
          <button class="dev-app__header-export-btn" @click="exportDocx">Export</button>
        </div>
      </div>

      <div id="toolbar" class="sd-toolbar"></div>

      <div class="dev-app__main">
        <div class="dev-app__view" id="dev-parent">
          <!-- temporary - debugging pagination -->
          <div style="display: flex; flex-direction: column; margin-right: 10px" v-if="isDebuggingPagination">
            <div v-for="i in 100" class="page-spacer" :style="debugPageStyle">page: {{ i }}</div>
          </div>

          <div class="dev-app__content" v-if="currentFile">
            <n-message-provider>
              <SuperEditor :file-source="currentFile" :options="editorOptions" />
            </n-message-provider>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.super-editor {
  border: 1px solid black;
}
</style>

<style scoped>
.sd-toolbar {
  width: 100%;
  background: white;
  position: relative;
  z-index: 1;
}

.page-spacer {
  height: 11in;
  width: 60px;
  background-color: #0000aa55;
  border: 1px solid black;
  margin-bottom: 18px;
  display: flex;
  justify-content: center;
}

.page-spacer:nth-child(odd) {
  background-color: #aa000055;
}

.dev-app {
  --header-height: 154px;
  --toolbar-height: 39px;

  width: 100%;
  height: 100vh;
}

.dev-app__layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
}

.dev-app__header {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  background-color: rgb(222, 237, 243);
  padding: 20px;
}

.dev-app__header-side {
  display: flex;
}

.dev-app__header-side--left {
  flex-direction: column;
}

.dev-app__header-side--right {
  align-items: flex-end;
}

.dev-app__main {
  display: flex;
  overflow-y: auto;
}

.dev-app__view {
  width: 100%;
  display: flex;
  padding-top: 20px;
  padding-left: 20px;
  padding-right: 20px;
  flex-grow: 1;
  justify-content: center;
}

.dev-app__content {
  display: flex;
  justify-content: center;
}

.dev-app__content-container {
  width: 100%;
  display: flex;
}

.dev-app__inputs-panel {
  display: grid;
  height: calc(100vh - var(--header-height) - var(--toolbar-height));
  background: #fff;
  border-right: 1px solid #dbdbdb;
}

.dev-app__inputs-panel-content {
  display: grid;
  overflow-y: auto;
  scrollbar-width: none;
}

.dev-app__content-injection {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-right: 20px;
  min-width: 300px;
}

.dev-app__content-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.dev-app__content-type {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
}

.dev-app__inject-btn {
  padding: 6px 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.dev-app__inject-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.dev-app__inject-btn:not(:disabled):hover {
  background-color: #0056b3;
}

.dev-app__content-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.dev-app__content-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.dev-app__autocomplete-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.dev-app__autocomplete-wand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: none;
  transition: background-color 0.2s;
}
.dev-app__autocomplete-wand svg {
  fill: #8090a8;
  width: 24px;
  height: 24px;
  margin-right: 2px;
}
.dev-app__autocomplete-wand.active {
  background-color: #e0fee3;
}
.dev-app__autocomplete-wand.active svg {
  fill: #33bb42;
}

.dev-app__autocomplete-toggle input[type='checkbox'] {
  margin: 0;
}

.dev-app__autocomplete-endpoint {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 4px;
}

.dev-app__autocomplete-status {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  color: #6c757d;
}
</style>
