<template>
  <div class="app">
    <div class="app-layout">
      <Sidebar
        :current-document="currentDocument"
        :editor="editor"
        @document-loaded="handleDocumentLoaded"
        @document-saved="handleDocumentSaved"
        @new-document="handleNewDocument"
      />
      <main class="main-content">
        <DocumentEditor
          :initial-data="documentFile"
          @editor-ready="handleEditorReady"
        />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import DocumentEditor from './components/DocumentEditor.vue';
import Sidebar from './components/Sidebar.vue';

const documentFile = ref(null);
const currentDocument = ref(null);
const editor = ref(null);

const handleDocumentLoaded = (file) => {
  documentFile.value = file;
  currentDocument.value = {
    name: file.name,
    size: file.size,
    lastModified: file.lastModified || new Date(),
    type: file.type
  };
  console.log('Document loaded:', file.name);
};

const handleDocumentSaved = () => {
  console.log('Document saved successfully');
};

const handleNewDocument = () => {
  documentFile.value = null;
  currentDocument.value = null;
  console.log('New document created');
};

const handleEditorReady = (editorInstance) => {
  editor.value = editorInstance;
  console.log('SuperDoc editor is ready', editorInstance);
};
</script>

<style>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-layout {
  display: flex;
  height: 100%;
  flex: 1;
}

.main-content {
  flex: 1;
  padding: 1rem;
  overflow: hidden;
  transition: margin-left 0.3s ease;
}

/* Global styles for SuperDoc */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

* {
  box-sizing: border-box;
}
</style>