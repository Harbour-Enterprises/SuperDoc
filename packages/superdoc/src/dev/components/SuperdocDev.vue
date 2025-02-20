<script setup>
import '@harbour-enterprises/common/styles/common-styles.css';
import { nextTick, onMounted, provide, ref, shallowRef } from 'vue';

import { SuperDoc } from '@superdoc/core/index.js';
import { DOCX, PDF, HTML } from '@harbour-enterprises/common';
import { BasicUpload, getFileObject } from '@harbour-enterprises/common';
import { fieldAnnotationHelpers } from '@harbour-enterprises/super-editor';
import BlankDOCX from '@harbour-enterprises/common/data/blank.docx?url';
import { toolbarIcons } from '../../../../super-editor/src/components/toolbar/toolbarIcons';

/* For local dev */
let superdoc = shallowRef(null);
let activeEditor = shallowRef(null);

const currentFile = ref(null);

const handleNewFile = async (file) => {
  // Generate a file url
  const url = URL.createObjectURL(file);
  currentFile.value = await getFileObject(url, file.name, file.type);

  nextTick(() => {
    init();
  });
};

const init = async () => {
  const user = {
    name: 'Super Document Jr.',
    email: 'user@harbourshare.com',
  };

  let testId = 'document-123';
  // const testId = "document_6a9fb1e0725d46989bdbb3f9879e9e1b";
  const config = {
    superdocId: 'superdoc-dev',
    selector: '#superdoc',
    toolbar: 'toolbar',
    // toolbarGroups: ['center'],
    role: 'editor',
    documentMode: 'editing',
    toolbarGroups: ['left', 'center', 'right'],
    pagination: true,
    rulers: true,
    telemetry: false,
    // isDev: true,
    user: {
      name: `SuperDoc ${Math.floor(1000 + Math.random() * 9000)}`,
      email: 'user@harbourshare.com',
    },
    documents: [
      {
        data: currentFile.value,
        id: testId,
        isNewFile: true,
      },
    ],
    modules: {
      comments: {
        // readOnly: true,
        // allowResolve: false,
      },
      'hrbr-fields': {},

      // To test this dev env with collaboration you must run a local collaboration server here.
      // collaboration: {
      //   url: 'ws://localhost:3050/docs/superdoc-id',
      //   token: 'token',
      // }
    },
    onEditorCreate,
    onContentError,
    // handleImageUpload: async (file) => url,
    // Override icons.
    toolbarIcons: {},
  };

  superdoc.value = new SuperDoc(config);
};

const onContentError = ({ editor, error, documentId, file }) => {
  console.debug('Content error on', documentId, error);
};

const exportDocx = async () => {
  const result = await activeEditor.value?.exportDocx();
  const blob = new Blob([result], { type: DOCX });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'exported.docx';
  a.click();
};

const onEditorCreate = ({ editor }) => {
  activeEditor.value = editor;

  editor.on('fieldAnnotationClicked', (params) => {
    console.log('fieldAnnotationClicked', { params });
  });

  editor.on('fieldAnnotationSelected', (params) => {
    console.log('fieldAnnotationSelected', { params });
  });
};

onMounted(async () => {
  handleNewFile(await getFileObject(BlankDOCX, 'test.docx', DOCX));
});
</script>

<template>
  <div class="dev-app">
    <div class="dev-app__layout">
      <div class="dev-app__header">
        <div class="dev-app__header-side dev-app__header-side--left">
          <div class="dev-app__header-title">
            <h2>🦋 SuperDoc Dev</h2>
          </div>
          <div class="dev-app__header-upload">
            Upload docx, pdf or (soon) html
            <BasicUpload @file-change="handleNewFile" />
          </div>
        </div>
        <div class="dev-app__header-side dev-app__header-side--right">
          <button class="dev-app__header-export-btn" @click="exportDocx">Export Docx</button>
        </div>
      </div>

      <div id="toolbar" class="sd-toolbar"></div>

      <div class="dev-app__main">
        <div class="dev-app__view">
          <div class="dev-app__content" v-if="currentFile">
            <div class="dev-app__content-container">
              <div id="superdoc"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.sd-toolbar {
  width: 100%;
}
.superdoc .super-editor {
  background-color: white;
  border-radius: 16px;
  border: 1px solid #d3d3d3 !important;
  text-align: left;
  box-shadow: 0 0 5px hsla(0, 0%, 0%, 0.05);
  transition: all 0.18s ease-out;
}
.superdoc .super-editor:hover {
  border: 1px solid #0160cc86;
  box-shadow: 0 0 5px hsla(0, 0%, 0%, 0.1);
}
.superdoc .super-editor:focus-within {
  border: 1px solid #015fcc;
  box-shadow: 0 0 5px hsla(0, 0%, 0%, 0.3);
}

@media screen and (max-width: 1024px) {
  .superdoc {
    max-width: calc(100vw - 10px);
  }
}
</style>

<style scoped>
.dev-app {
  --header-height: 154px;
  --toolbar-height: 39px;

  width: 100%;
  height: 100vh;
}

.dev-app__layout {
  display: grid;
  width: 100%;
  height: 100vh;
}

.dev-app__header {
  display: flex;
  justify-content: space-between;
  background-color: rgb(222, 237, 243);
  padding: 20px;
  box-sizing: border-box;
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
  justify-content: center;
}

.dev-app__view {
  display: flex;
  padding-top: 20px;
  overflow-y: auto;
}

.dev-app__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.dev-app__content-container {
  width: auto;
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
