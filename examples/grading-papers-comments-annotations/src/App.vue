<script setup>
import '@harbour-enterprises/superdoc/style.css';
import { ref, shallowRef, onMounted } from 'vue';
import Header from './components/Header.vue';
import AssignmentHeader from './components/AssignmentHeader.vue';
import Drawer from './components/Drawer.vue';
import { SuperDoc } from '@harbour-enterprises/superdoc';
import AlexEssay from '/essay.docx?url';
import NickPDF from '/nick.pdf?url';

const annotationText = ref('Annotation Mode');
const isDrawerOpen = ref(false);
const superdoc = shallowRef(null);
const docFile = ref(null);
const openDrawer = () => {
  isDrawerOpen.value = true;
};

const closeDrawer = () => {
  isDrawerOpen.value = false;
};

const initSuperDoc = () => {
  console.debug("--CURRENT FILE--", docFile.value);
  superdoc.value = new SuperDoc({
    selector: "#superdoc",
    document: {
      data: docFile.value
    },
    pagination: true,
    toolbar: 'superdoc-toolbar',
    licenseKey: "community-and-eval-agplv3",
    modules: {
      comments: {},
      toolbar: {
        selector: '#superdoc-toolbar',
        responsiveToContainer: true,
        excludeItems: ['acceptTrackedChangeBySelection', 'rejectTrackedChangeOnSelection', 'zoom', 'documentMode'],
      }
    },
    user: {
      name: 'Sarah Smith',
      email: 'sarah.smith@example.com'
    }
  });
}

const handleNewFile = async (fileName) => {
  let url, fileType, fileNameStr;
  superdoc.value?.toggleAnnotationMode(false)

  switch (fileName) {
    case 'alex':
      url = AlexEssay;
      fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      fileNameStr = 'essay.docx';
      break;
    case 'nick':
      url = NickPDF;
      fileType = 'application/pdf';
      fileNameStr = 'nick.pdf';
      break;
    default:
      return;
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], fileNameStr, { type: fileType });
    docFile.value = file;
    initSuperDoc();
  } catch (err) {
    console.error('Error fetching file:', err);
  }
}

const toggleAnnotation = () => {
  annotationText.value = annotationText.value === 'Annotation Mode' ? 'Exit Annotation Mode' : 'Annotation Mode';
  superdoc.value.toggleAnnotationMode();
}

onMounted(() => {
  handleNewFile('alex');
})
</script>

<template>
  <div>
    <Header />

    <div class="app-container">
      <div class="container">
        <AssignmentHeader />

        <div class="main-content">
          <div class="document-viewer">
            <div class="free-annotation">
              <button class="toggle-annotation" @click="toggleAnnotation">{{ annotationText }}</button>
            </div>

            <div class="viewer-header">
              <h3>Document Viewer</h3>
              <button class="download-btn" id="downloadBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
            </div>
            <div id="superdoc-toolbar"></div>
            <div id="superdoc"></div>
          </div>
        </div>
      </div>

      <Drawer @select-file="handleNewFile" />
    </div>

  </div>
</template>

<style>
.free-annotation {
  position: absolute;
  top: 15px;
  right: 20px;
}
.free-annotation button {
  padding: 8px 16px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.superdoc-pdf-viewer-container {
  border: 1px solid #DBDBDB;
  border-radius: 8px;
}
.document-viewer {
  position: relative;
}
.free-annotations--hidden {
  pointer-events: none;
  opacity: 0.5;
}

.free-annotations--hidden canvas {
  pointer-events: none !important;
  cursor: default !important;
}
</style>

<style scoped>
#superdoc {
  margin: 10px 0;
  padding: 0 0 10px 0;
}
</style>
