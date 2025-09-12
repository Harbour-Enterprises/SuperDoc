<script setup>
import '@/style.css';
import '@harbour-enterprises/common/styles/common-styles.css';

import { ref, shallowRef, computed, onMounted } from 'vue';
import { NMessageProvider } from 'naive-ui';
import { SuperEditor } from '@/index.js';
import { getFileObject } from '@harbour-enterprises/common/helpers/get-file-object';
import { DOCX } from '@harbour-enterprises/common';
import { SuperToolbar } from '@components/toolbar/super-toolbar';
import { PaginationPluginKey } from '@extensions/pagination/pagination-helpers.js';
import BasicUpload from './BasicUpload.vue';
import BlankDOCX from '@harbour-enterprises/common/data/blank.docx?url';
import { Telemetry } from '@harbour-enterprises/common/Telemetry.js';

// Import the component the same you would in your app
let activeEditor;
const currentFile = ref(null);
const pageStyles = ref(null);
const isDebuggingPagination = ref(false);
const telemetry = shallowRef(null);

// Style override testing controls
const useStyleOverrides = ref(true);
const stylePreset = ref('corporate');

// Style preset configurations for testing
const stylePresets = {
  corporate: {
    defaultFont: 'Arial',
    defaultFontSize: 11,
    styles: {
      'Normal': {
        font: 'Arial',
        fontSize: 11
      },
      'Heading1': {
        font: 'Arial Black',
        fontSize: 18,
        color: '#003366'
      },
      'Heading2': {
        font: 'Arial',
        fontSize: 16,
        color: '#003366'
      }
    }
  },
  modern: {
    defaultFont: 'Segoe UI',
    defaultFontSize: 10,
    styles: {
      'Normal': {
        font: 'Segoe UI',
        fontSize: 10
      },
      'Heading1': {
        font: 'Segoe UI',
        fontSize: 24,
        color: '#2563eb'
      }
    }
  },
  classic: {
    defaultFont: 'Times New Roman',
    defaultFontSize: 12,
    styles: {
      'Heading1': {
        font: 'Georgia',
        fontSize: 18,
        color: '#8b5a3c'
      }
    }
  },
  accessibility: {
    defaultFont: 'Verdana',
    defaultFontSize: 14,
    styles: {
      'Normal': {
        fontSize: 14
      },
      'Heading1': {
        fontSize: 20
      }
    }
  }
};

const handleNewFile = async (file) => {
  currentFile.value = null;
  const fileUrl = URL.createObjectURL(file);
  currentFile.value = await getFileObject(fileUrl, file.name, file.type);
};

const onCreate = ({ editor }) => {
  console.debug('[Dev] Editor created', editor);
  console.debug('[Dev] Page styles (pixels)', editor.getPageStyles());
  console.debug('[Dev] document styles', editor.converter?.getDocumentDefaultStyles());

  // Debug logging for style overrides
  console.log('=== Style Debug ===');
  console.log('Style overrides passed:', editor.options.styleOverrides);
  console.log('Converter styles:', editor.converter?.getDocumentDefaultStyles());

  // Check actual DOM styles
  setTimeout(() => {
    const editorEl = editor.element;
    const computedStyle = window.getComputedStyle(editorEl);
    console.log('Applied font-family:', computedStyle.fontFamily);
    console.log('Applied font-size:', computedStyle.fontSize);
  }, 100);

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

    // Style overrides for testing
    styleOverrides: useStyleOverrides.value ? stylePresets[stylePreset.value] : undefined,
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

onMounted(async () => {
  // set document to blank
  currentFile.value = await getFileObject(BlankDOCX, 'blank_document.docx', DOCX);

  telemetry.value = new Telemetry({
    enabled: false,
    superdocId: 'dev-playground',
  });
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
          <div class="dev-app__style-controls">
            <label>
              <input type="checkbox" v-model="useStyleOverrides">
              Use Style Overrides
            </label>
            <select v-model="stylePreset" v-if="useStyleOverrides">
              <option value="corporate">Corporate</option>
              <option value="modern">Modern</option>
              <option value="classic">Classic</option>
              <option value="accessibility">Accessibility</option>
            </select>
          </div>
        </div>
        <div class="dev-app__header-side dev-app__header-side--right">
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

.dev-app__style-controls {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.dev-app__style-controls label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}

.dev-app__style-controls select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
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
</style>
