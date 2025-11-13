<script setup>
import 'superdoc/style.css';
import BlankDOCX from './data/blank.docx?url';
import { onMounted, shallowRef } from 'vue';
import { SuperDoc } from 'superdoc';

import { CustomMark } from './custom-mark.js';
import { nextTick } from 'process';

window.fileData = null;
const superdoc = shallowRef(null);
const init = async () => {
  if (superdoc.value) superdoc.value.destroy();

  const config = {
    selector: '#editor',
    pagination: false,
    toolbar: '#toolbar',
    toolbarGroups: ['center'],
    onReady,
    onTransaction,
  };

  // Get query params to determine if this is a toolbar test
  // In such case we want to add a custom button for testing
  const isToolbarTest = window.location.search.includes('includeCustomButton=true');
  const isFontsTest = window.location.search.includes('includeFontsResolved=true');

  if (isToolbarTest) {
    config.editorExtensions = [CustomMark];
    config.modules = {
      toolbar: {
        selector: '#toolbar',
        toolbarGroups: ['center'],
        customButtons: [
          {
            type: 'button',
            name: 'insertCustomMark',
            command: 'setMyCustomMark',
            tooltip: 'Insert Custom Mark',
            group: 'center',
            icon: '🎧',
          },
        ],
      },
    };
    config.toolbar = null;
  } else {
    config.toolbar = '#toolbar';
    config.toolbarGroups = ['center'];
  }

  if (isFontsTest) {
    config.onFontsResolved = onFontsResolved;
  }

  if (superdoc.value) superdoc.value.destroy();

  if (window.fileData) {
    const fileExtension = window.fileData.name.split('.').pop()?.toLowerCase();
    const isHtml = fileExtension === 'html' || fileExtension === 'htm';
    if (isHtml) {
      const fileObj = await getFileObject(
        BlankDOCX,
        'blank.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      const content = await readFileAsText(window.fileData);
      config.document = { data: fileObj, html: content };
    } else {
      config.document = {
        data: new File([window.fileData], 'document.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        type: 'docx',
      };
    }
  }

  nextTick(() => {
    if (!config.modules) config.modules = {};
    superdoc.value = new SuperDoc(config);
  });
};

const onReady = () => {
  superdoc.value.activeEditor.on('create', ({ editor }) => {
    window.editor = editor;
    window.superdoc = superdoc.value;
  });
  if (window.superdocReady) {
    window.superdocReady();
  }
};

const handleFileChange = async (event) => {
  const file = event.target.files?.[0];
  if (file) {
    window.fileData = file;
    await init();
  }
};

const getFileObject = async (fileUrl, name, type) => {
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  return new File([blob], name, { type });
};

const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const onTransaction = ({ duration }) => {
  if (window.onTransaction) {
    window.onTransaction({ duration });
  }
};

const onFontsResolved = ({ documentFonts, unsupportedFonts }) => {
  if (window.onFontsResolved) {
    window.onFontsResolved({ documentFonts, unsupportedFonts });
  }
};

onMounted(() => {
  init();
});
</script>

<template>
  <div class="example-container" data-testid="example-container">
    <h1>SuperDoc: Testing template</h1>
    <input type="file" ref="fileInput" accept=".docx,.pdf,.html" @change="handleFileChange" />
    <div id="toolbar" class="my-custom-toolbar"></div>
    <div id="editor" class="main-editor" data-testid="editor"></div>
  </div>
</template>

<style>
button {
  padding: 0.5rem 1rem;
  background: #1355ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #0044ff;
}

.hidden {
  display: none;
}
</style>
