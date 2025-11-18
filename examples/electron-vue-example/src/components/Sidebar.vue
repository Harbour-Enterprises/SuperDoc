<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <h3 v-if="!isCollapsed">Document Tools</h3>
      <button 
        @click="toggleSidebar" 
        class="toggle-button"
        :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        {{ isCollapsed ? '→' : '←' }}
      </button>
    </div>
    
    <div class="sidebar-content" v-if="!isCollapsed">
      <div class="button-group">
        <button 
          @click="handleLoadDocument" 
          class="sidebar-button"
          :disabled="loading"
        >
          {{ loading ? 'Loading...' : 'Load Document' }}
        </button>
        
        <button 
          @click="handleSaveDocument" 
          class="sidebar-button"
          :disabled="saving || !hasDocument"
        >
          {{ saving ? 'Saving...' : 'Save Document' }}
        </button>
      </div>

      <div class="document-info" v-if="currentDocument">
        <h4>Current Document</h4>
        <p class="document-name">{{ currentDocument.name }}</p>
        <p class="document-size">{{ formatFileSize(currentDocument.size) }}</p>
        <button 
          @click="handleNewDocument" 
          class="sidebar-button"
        >
          New Document
        </button>
      </div>

      <div class="recent-files" v-if="recentFiles.length">
        <h4>Recent Files</h4>
        <ul class="recent-list">
          <li 
            v-for="file in recentFiles" 
            :key="file.path"
            @click="handleLoadRecentFile(file)"
            class="recent-item"
          >
            <span class="file-name">{{ file.name }}</span>
            <span class="file-date">{{ formatDate(file.lastOpened) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { DocumentStorage } from '../utils/storage.js';

const emit = defineEmits(['document-loaded', 'document-saved', 'new-document']);

const props = defineProps({
  currentDocument: {
    type: Object,
    default: null
  },
  editor: {
    type: Object,
    default: null
  }
});

const loading = ref(false);
const saving = ref(false);
const recentFiles = ref([]);
const isCollapsed = ref(false);

const hasDocument = computed(() => {
  return props.currentDocument !== null;
});

const handleLoadDocument = async () => {
  try {
    loading.value = true;
    const file = await DocumentStorage.loadDocument();
    
    if (file) {
      // Add to recent files
      addToRecentFiles({
        name: file.name,
        path: file.path || '',
        lastOpened: new Date()
      });
      
      emit('document-loaded', file);
    }
  } catch (error) {
    console.error('Error loading document:', error);
    alert('Failed to load document: ' + error.message);
  } finally {
    loading.value = false;
  }
};

const handleSaveDocument = async () => {
  if (!props.editor) {
    alert('No editor available');
    return;
  }

  try {
    saving.value = true;
    
    // Get document data from editor
    const documentBlob = await DocumentStorage.getDocumentFromEditor(props.editor);
    
    // Generate default filename
    const defaultName = props.currentDocument?.name || 'document.docx';
    
    const success = await DocumentStorage.saveDocument(documentBlob, defaultName);
    
    if (success) {
      emit('document-saved');
      alert('Document saved successfully!');
    }
  } catch (error) {
    console.error('Error saving document:', error);
    alert('Failed to save document: ' + error.message);
  } finally {
    saving.value = false;
  }
};

const handleNewDocument = () => {
  if (confirm('Create a new document? Unsaved changes will be lost.')) {
    emit('new-document');
  }
};

const handleLoadRecentFile = async (file) => {
  try {
    loading.value = true;
    // For now, we'll just emit the file info
    // In a real implementation, you'd load from the file path
    emit('document-loaded', file);
  } catch (error) {
    console.error('Error loading recent file:', error);
    alert('Failed to load recent file: ' + error.message);
  } finally {
    loading.value = false;
  }
};

const addToRecentFiles = (file) => {
  // Remove if already exists
  const existingIndex = recentFiles.value.findIndex(f => f.path === file.path);
  if (existingIndex > -1) {
    recentFiles.value.splice(existingIndex, 1);
  }
  
  // Add to beginning
  recentFiles.value.unshift(file);
  
  // Keep only last 5 files
  recentFiles.value = recentFiles.value.slice(0, 5);
  
  // Save to localStorage
  localStorage.setItem('recentFiles', JSON.stringify(recentFiles.value));
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};

// Load recent files from localStorage on mount
const loadRecentFiles = () => {
  try {
    const saved = localStorage.getItem('recentFiles');
    if (saved) {
      recentFiles.value = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading recent files:', error);
  }
};

// Load recent files when component mounts
loadRecentFiles();
</script>

<style scoped>
.sidebar {
  width: 280px;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: 50px;
}

.sidebar-header {
  padding: 1rem;
  background: #343a40;
  color: white;
  border-bottom: 1px solid #495057;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 60px;
}

.sidebar.collapsed .sidebar-header {
  padding: 1rem 0.5rem;
  justify-content: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.toggle-button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.toggle-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.sidebar-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.sidebar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  width: 100%;
  background: #007bff;
  color: white;
}

.sidebar-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sidebar-button:hover:not(:disabled) {
  background: #0056b3;
}

.document-info {
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 1rem;
  background: white;
  margin-bottom: 2rem;
}

.document-info h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #495057;
  text-transform: uppercase;
  font-weight: 600;
}

.document-name {
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: #212529;
  word-break: break-word;
}

.document-size {
  font-size: 0.85rem;
  color: #6c757d;
  margin: 0 0 1rem 0;
}

.recent-files {
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 1rem;
  background: white;
}

.recent-files h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #495057;
  text-transform: uppercase;
  font-weight: 600;
}

.recent-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recent-item {
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f1f3f4;
}

.recent-item:last-child {
  border-bottom: none;
}

.recent-item:hover {
  background: #f8f9fa;
}

.file-name {
  display: block;
  font-weight: 500;
  color: #212529;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.file-date {
  display: block;
  font-size: 0.8rem;
  color: #6c757d;
}
</style>