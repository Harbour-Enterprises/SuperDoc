<script setup>
import { ref, onMounted, watch } from 'vue';
import { SuperDoc } from 'superdoc';
import JsonHighlight from './components/JsonHighlight.vue';
import 'superdoc/style.css';

// State
const superdoc = ref(null);
const editor = ref(null);
const commentsJson = ref('[]');

const activeTab = ref('about');
watch(activeTab, (newTab) => {
  if (newTab === 'comments') updateCommentsDisplay();
});

const fileInput = ref(null);
const copyButtonText = ref('📋 Copy JSON');

// Methods
const updateCommentsDisplay = () => {
  if (!editor.value) return;
  console.log("Updating comments display...");
  const { translateCommentsForExport } = editor.value.superdoc.superdocStore.commentsStore;
  
  try {
    const comments = translateCommentsForExport();
    
    commentsJson.value = JSON.stringify(comments, null, 2);
  } catch (e) {
    console.error('Error updating comments display:', e);
  }
};

const handleNewDocument = async () => {
  try {
    // Reinitialize with blank document
    await initializeSuperdoc();
  } catch (e) {
    console.error('Failed to create new document:', e);
  }
};

const handleSampleDocument = async () => {
  try {
    // Load the sample document from public folder
    await initializeSuperdoc('/sdpr.docx');
  } catch (e) {
    console.error('Failed to load sample document:', e);
  }
};

const handleImport = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    // Reinitialize with new document
    await initializeSuperdoc(file);
  } catch (e) {
    console.error('Import failed:', e);
  }
  
  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const copyCommentsJson = async () => {
  try {
    await navigator.clipboard.writeText(commentsJson.value);
    copyButtonText.value = '✓ Copied!';
    setTimeout(() => {
      copyButtonText.value = '📋 Copy JSON';
    }, 2000);
  } catch (e) {
    console.error('Failed to copy:', e);
    copyButtonText.value = '❌ Failed';
    setTimeout(() => {
      copyButtonText.value = '📋 Copy JSON';
    }, 2000);
  }
};

const handleExport = async () => {
  if (!superdoc.value || !editor.value) return;

  try {
    editor.value.exportDocx();
  } catch (e) {
    console.error('Export failed:', e);
  }
};

// Initialize SuperDoc
const initializeSuperdoc = async (documentFile = null) => {
  try {
    const config = {
      selector: '#superdoc-container',
      toolbar: '#superdoc-toolbar',
      documentMode: 'editing',
      user: {
        name: 'Demo User',
        email: 'demo@example.com'
      },
      modules: {
        comments: {
          element: '#comments-sidebar',
          readOnly: false,
          allowResolve: true,
          useInternalExternalComments: false
        }
      },
      onReady: (event) => {
        console.log('SuperDoc ready', event);
        editor.value = event;
      }
    };
    if (documentFile) {
      config.document = documentFile;
    }

    // Create new SuperDoc instance
    superdoc.value = new SuperDoc(config);
  } catch (e) {
    console.error('Failed to initialize:', e);
  }
};

// Lifecycle
onMounted(() => {
  // Start with the sample document
  initializeSuperdoc('/sdpr.docx');
});
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>SuperDoc Comments Export Demo</h1>
    </header>

    <main class="app-main">
      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'document' }"
          @click="activeTab = 'document'"
        >
          📄 Document
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'comments' }"
          @click="activeTab = 'comments'"
        >
          💬 Comments
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'about' }"
          @click="activeTab = 'about'"
        >
          ℹ️ About
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Document Tab -->
        <div v-show="activeTab === 'document'" class="document-view">
          <div class="document-controls">
            <div class="control-group">
              <button @click="handleNewDocument" class="btn btn-secondary">
                📄 New Document
              </button>
              <button @click="handleImport" class="btn btn-secondary">
                📥 Import Document
              </button>
              <button @click="handleSampleDocument" class="btn btn-secondary">
                📝 Sample Document
              </button>
              <input 
                ref="fileInput" 
                type="file" 
                accept=".docx"
                @change="handleFileSelect"
                style="display: none;"
              >
            </div>
            <div class="control-group">
              <button @click="handleExport" class="btn btn-primary" :disabled="!superdoc">
                📤 Export Document
              </button>
            </div>
          </div>

          <div class="document-wrapper">
            <div id="superdoc-toolbar" class="toolbar"></div>
            <div id="superdoc-container" class="editor-container"></div>
          </div>
        </div>

        <!-- Comments Tab -->
        <div v-show="activeTab === 'comments'" class="comments-view">
          <div class="comments-header">
            <h3>Current Comments JSON</h3>
            <button @click="copyCommentsJson" class="btn btn-secondary btn-small">
              {{ copyButtonText }}
            </button>
          </div>
          <div class="json-wrapper">
            <JsonHighlight :json="commentsJson" />
          </div>
        </div>

        <!-- About Tab -->
        <div v-show="activeTab === 'about'" class="about-view">
          <div class="about-content">
            <h2>📋 About This Demo</h2>
            <p>
              This demo visualizes the JSON structure of comments that SuperDoc uses when exporting documents.
            </p>
            <div class="info-card">
              <h3>How it works:</h3>
              <ul>
                <li>Add comments to the document in the <strong>Document</strong> tab</li>
                <li>View the JSON structure in the <strong>Comments</strong> tab</li>
                <li>Export the document with different comment settings</li>
              </ul>
            </div>
            <div class="info-card">
              <h3>Comment Structure:</h3>
              <p>Each comment includes:</p>
              <ul>
                <li>Unique identifier and timestamps</li>
                <li>Author information (name, email)</li>
                <li>Comment text and resolved status</li>
                <li>Position data for accurate placement</li>
                <li>Parent-child relationships for threaded discussions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>

  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.app-header {
  background: white;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.app-header h1 {
  font-size: 1.8rem;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  background: white;
  padding: 0 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.tab-button {
  padding: 1rem 2rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: #666;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  color: #333;
}

.tab-button.active {
  color: #1355ff;
  border-bottom-color: #1355ff;
}

/* Tab Content */
.tab-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: white;
  margin: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Document View */
.document-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.document-controls {
  padding: 1rem;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Comments View */
.comments-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.comments-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comments-header h3 {
  font-size: 1.2rem;
  color: #333;
  margin: 0;
}

.json-wrapper {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: 1rem;
  background: #f5f5f5;
}

/* Buttons */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-primary {
  background: #1355ff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0044dd;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.document-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.toolbar {
  flex: 0 0 auto;
  border-bottom: 1px solid #e8e8e8;
  min-height: 50px;
  background: #fafafa;
}

.editor-container {
  flex: 1;
  overflow: auto;
  position: relative;
}

/* SuperDoc overrides for better integration */
:deep(.super-editor-container) {
  height: 100%;
  max-width: none !important;
}

:deep(.super-editor) {
  margin: 0 !important;
}

:deep(.ProseMirror) {
  padding: 2rem;
}

/* About View */
.about-view {
  flex: 1;
  overflow: auto;
  padding: 2rem;
  background: #f9f9f9;
}

.about-content {
  max-width: 800px;
  margin: 0 auto;
}

.about-content h2 {
  font-size: 1.8rem;
  color: #1a1a1a;
  margin-bottom: 1.5rem;
  text-align: center;
}

.about-content > p {
  font-size: 1.1rem;
  color: #666;
  text-align: center;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.info-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
}

.info-card h3 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 1rem;
}

.info-card p {
  color: #666;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.info-card ul {
  list-style: none;
  padding: 0;
}

.info-card li {
  color: #666;
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  line-height: 1.5;
}

.info-card li::before {
  content: "•";
  color: #1355ff;
  font-weight: bold;
  position: absolute;
  left: 0;
}
</style>