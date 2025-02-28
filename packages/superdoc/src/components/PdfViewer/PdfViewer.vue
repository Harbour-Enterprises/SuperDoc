<script setup>
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as pdfjsViewer from 'pdfjs-dist/web/pdf_viewer';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?worker';
import workerSrc from './worker.js?raw';

import { storeToRefs } from 'pinia';
import { onMounted, ref, reactive, computed, getCurrentInstance } from 'vue';
import { useSuperdocStore } from '@superdoc/stores/superdoc-store';
import useSelection from '@superdoc/helpers/use-selection';

window.pdfjsWorker = pdfjsWorker;
pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
  new Blob([workerSrc], {
    type: 'application/javascript',
  }),
);

const emit = defineEmits(['page-loaded', 'ready', 'selection-change', 'bypass-selection']);
const superdocStore = useSuperdocStore();
const { proxy } = getCurrentInstance();
const { activeZoom } = storeToRefs(superdocStore);
const totalPages = ref(null);
const viewer = ref(null);
const props = defineProps({
  documentData: {
    type: Object,
    required: true,
  },
});

const id = props.documentData.id;
const pdfData = props.documentData.data;
const selectionBounds = reactive({});

const getOriginalPageSize = (page) => {
  const viewport = page.getViewport({ scale: 1 });
  const width = viewport.width;
  const height = viewport.height;
  return { width, height };
};

async function initPdfLayer(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument(arrayBuffer);
  return await loadingTask.promise;
}

async function loadPDF(fileObject) {
  const fileReader = new FileReader();
  fileReader.onload = async function (event) {
    const pdfDocument = await initPdfLayer(event.target.result);
    await renderPages(pdfDocument);
  };
  fileReader.readAsArrayBuffer(fileObject);
}

const enableTextLayer = (container, state) => {
  const textLayer = container.querySelector('.textLayer');
  if (textLayer) textLayer.style.pointerEvents = state ? 'auto' : 'none';
};

const renderPages = (pdfDocument) => {
  setTimeout(() => {
    _renderPages(pdfDocument);
  }, 150);
};

async function _renderPages(pdfDocument) {
  try {
    const numPages = pdfDocument.numPages;
    totalPages.value = numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const container = document.createElement('div');
      container.className = 'pdf-page';
      container.dataset.pageNumber = i;
      container.id = `${id}-page-${i}`;
      viewer.value.appendChild(container);

      const { width, height } = getOriginalPageSize(page);
      const scale = 1;
      const eventBus = new pdfjsViewer.EventBus();
      const pdfPageView = new pdfjsViewer.PDFPageView({
        container,
        id: i,
        scale,
        defaultViewport: page.getViewport({ scale }),
        eventBus,
      });

      const viewport = page.getViewport({ scale });
      const containerBounds = container.getBoundingClientRect();
      containerBounds.originalWidth = width;
      containerBounds.originalHeight = height;
      pdfPageView.setPdfPage(page);
      await pdfPageView.draw();

      // Emit page information
      emit('page-loaded', id, i, containerBounds);
    }

    emit('ready', id, viewer);
  } catch (error) {
    console.error('Error loading PDF:', error);
  }
}

function getSelectedTextBoundingBox(container) {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const boundingRects = range.getClientRects();

  if (boundingRects.length === 0) {
    return null;
  }

  // Initialize bounding box with the first bounding rectangle
  const firstRect = boundingRects[0];
  let boundingBox = {
    top: firstRect.top,
    left: firstRect.left,
    bottom: firstRect.bottom,
    right: firstRect.right,
  };

  for (let i = 1; i < boundingRects.length; i++) {
    const rect = boundingRects[i];
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }
    boundingBox.top = Math.min(boundingBox.top, rect.top);
    boundingBox.left = Math.min(boundingBox.left, rect.left);
    boundingBox.bottom = Math.max(boundingBox.bottom, rect.bottom);
    boundingBox.right = Math.max(boundingBox.right, rect.right);
  }

  // Get the bounding box of the container
  const containerRect = container.getBoundingClientRect();
  const viewerRect = viewer.value.getBoundingClientRect();

  // Adjust the bounding box relative to the page
  boundingBox.top = (boundingBox.top - containerRect.top) / activeZoom.value + container.scrollTop;
  boundingBox.left = (boundingBox.left - containerRect.left) / activeZoom.value + container.scrollLeft;
  boundingBox.bottom = (boundingBox.bottom - containerRect.top) / activeZoom.value + container.scrollTop;
  boundingBox.right = (boundingBox.right - containerRect.left) / activeZoom.value + container.scrollLeft;

  return boundingBox;
}

onMounted(async () => {
  const doc = await loadPDF(pdfData);
});

const handlePdfClick = (e) => {
  const { target } = e;
  if (target.tagName !== 'SPAN') {
    emit('bypass-selection', e);
  }
};

const handleMouseUp = (e) => {
  const selection = window.getSelection();
  if (selection.toString().length > 0) {
    const selectionBounds = getSelectedTextBoundingBox(viewer.value);
    const sel = useSelection({
      selectionBounds,
      documentId: id,
    });
    emit('selection-change', sel);
  }
};
</script>

<template>
  <div class="superdoc-pdf-viewer-container" @mousedown="handlePdfClick" @mouseup="handleMouseUp">
    <div class="superdoc-pdf-viewer" ref="viewer" id="viewerId"></div>
  </div>
</template>

<style lang="postcss">
/** Global styles */
.superdoc-pdf-viewer {
  @nested-import 'pdfjs-dist/web/pdf_viewer.css';
}
</style>

<style lang="postcss" scoped>
.superdoc-pdf-viewer-container {
  width: 100%;
}

.superdoc-pdf-viewer {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;

  :deep(.pdf-page) {
    border-top: 1px solid #dfdfdf;
    border-bottom: 1px solid #dfdfdf;
    margin: 0 0 20px 0;
    position: relative;
    overflow: hidden;

    &:first-child {
      border-radius: 16px 16px 0 0;
      border-top: none;
    }

    &:last-child {
      border-radius: 0 0 16px 16px;
      border-bottom: none;
    }
  }

  :deep(.textLayer) {
    z-index: 2;
    position: absolute;

    &::selection {
      background-color: #1355ff66;
      mix-blend-mode: difference;
    }
  }
}
</style>
