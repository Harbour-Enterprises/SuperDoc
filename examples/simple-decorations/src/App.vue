<script setup>
import { onMounted, ref, shallowRef } from 'vue';
import { SuperDoc } from 'superdoc';
import { CustomHighlightExtension } from './CustomHighlightExtension.js';

const editor = shallowRef(null);
const editorElement = ref(null);
const hasSelection = ref(false);

const initEditor = (document = null) => {

  const config = {
    selector: '#editor',
    editorExtensions: [
      CustomHighlightExtension
    ],
    document,
    onEditorBeforeCreate: ({ editor: newEditor }) => {
      newEditor.on('selectionUpdate', ({ editor }) => {
        const { selection } = editor.state;
        hasSelection.value = selection.from !== selection.to;
      });
    }
  };

  if (document) {
    config.document = document;
  }

  editor.value = new SuperDoc(config);
};

const toggleHighlight = () => {
  if (!editor.value || !editor.value.activeEditor) return;
  
  const { selection } = editor.value.activeEditor.state;
  const { from, to } = selection;
  
  if (from === to) return;
  
  // Highlight just the selected range
  editor.value.activeEditor.commands.highlightSelection();
};

const clearAllHighlights = () => {
  if (!editor.value || !editor.value.activeEditor) return;
  
  editor.value.activeEditor.commands.clearHighlights();
};

const fileInput = ref(null);

const importDocument = () => {
  fileInput.value?.click();
};

const handleFileImport = async (event) => {
  const file = event.target.files?.[0];
  console.log('Importing file:', file);
  if (!file || !editor.value) return;

  initEditor(file); // Re-initialize editor to clear previous content
};

onMounted(() => {
  initEditor();
});
</script>

<template>
  <div class="app">
    <header>
      <h1>Decorations Example</h1>
    </header>

    <div class="controls">
      <button 
        @click="importDocument"
        class="import-button"
      >
        📁 Import Document
      </button>
      
      <button 
        @click="toggleHighlight" 
        :disabled="!hasSelection"
        :class="{ active: hasSelection }"
        class="highlight-button"
      >
        {{ hasSelection ? 'Highlight Text' : 'Select text first' }}
      </button>
      
      <button 
        @click="clearAllHighlights"
        class="clear-button"
      >
        Clear All
      </button>
    </div>

    <!-- Hidden file input -->
    <input 
      ref="fileInput"
      type="file"
      @change="handleFileImport"
      accept=".txt,.md,.docx"
      style="display: none;"
    />

    <div class="editor-container">
      <div ref="editorElement" class="editor" id="editor"></div>
    </div>

  </div>
</template>

<style>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: system-ui, -apple-system, sans-serif;
}

header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #eee;
}

header h1 {
  color: #333;
  margin-bottom: 10px;
}

header p {
  color: #666;
  font-size: 16px;
}

.controls {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.highlight-button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
}

.highlight-button:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
}

.highlight-button:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.highlight-button.active {
  background: #FF9800;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.clear-button {
  background: #f44336;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-button:hover:not(:disabled) {
  background: #da190b;
}

.clear-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.import-button {
  background: #2196F3;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.import-button:hover {
  background: #1976D2;
  transform: translateY(-1px);
}

.editor-container {
  margin: 20px 0;
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.editor {
  min-height: 200px;
}

.editor .ProseMirror {
  padding: 20px;
  font-size: 16px;
  line-height: 1.6;
  outline: none;
  min-height: 200px;
}

.editor .ProseMirror p {
  margin: 0 0 16px 0;
}

.editor .ProseMirror p:last-child {
  margin-bottom: 0;
}

/* Custom highlight styling */
.custom-highlight {
  background: yellow !important;
  border-radius: 2px !important;
}

/* SuperDoc search decoration styling - for reference */
.ProseMirror-search-match {
  background-color: #ffff0054 !important;
  border-radius: 3px;
  padding: 1px 2px;
}

.ProseMirror-active-search-match {
  background-color: #ff6a0054 !important;
  border-radius: 3px;
  padding: 1px 2px;
}

</style>