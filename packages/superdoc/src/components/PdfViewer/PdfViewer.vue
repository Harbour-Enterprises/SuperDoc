<script setup>
import { NSpin } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted, ref } from 'vue';
import { useSuperdocStore } from '@superdoc/stores/superdoc-store';
import { PDFAdapterFactory, createPDFConfig } from './pdf/pdf-adapter.js';
import { readFileAsArrayBuffer } from './helpers/read-file.js';
import useSelection from '@superdoc/helpers/use-selection';
import './pdf/pdf-viewer.css';

const emit = defineEmits(['page-loaded', 'ready', 'selection-change', 'bypass-selection']);

const props = defineProps({
  documentData: {
    type: Object,
    required: true,
  },
  config: {
    type: Object,
    required: true,
  },
});

const superdocStore = useSuperdocStore();
const { activeZoom } = storeToRefs(superdocStore);

const viewer = ref(null);
const isReady = ref(false);

const id = props.documentData.id;
const pdfData = props.documentData.data;

const pdfConfig = createPDFConfig({
  pdfLib: props.config.pdfLib,
  pdfViewer: props.config.pdfViewer,
  workerSrc: props.config.workerSrc,
  setWorker: props.config.setWorker,
  textLayerMode: props.config.textLayerMode,
});
const pdfAdapter = PDFAdapterFactory.create(pdfConfig);
const PDF_SELECTION_OFFSET = 2125;

const loadPDF = async (file) => {
  try {
    const result = await readFileAsArrayBuffer(file);
    const document = await pdfAdapter.getDocument(result);
    await pdfAdapter.renderPages({
      documentId: id,
      pdfDocument: document,
      viewerContainer: viewer.value,
      emit,
    });
    isReady.value = true;
  } catch {}
};

const getClosestPageElement = (node, container) => {
  if (!node) return null;

  let element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (element && element !== container) {
    if (element.classList?.contains('pdf-page')) return element;
    element = element.parentElement;
  }
  return null;
};

const getSelectedTextInfo = (container) => {
  const selection = window.getSelection();
  if (selection.rangeCount === 0 || selection.toString().trim().length === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const pageElement =
    getClosestPageElement(range.startContainer, container) ??
    getClosestPageElement(range.endContainer, container) ??
    container.querySelector('.pdf-page');

  if (!pageElement) return null;

  const clientRects = Array.from(range.getClientRects()).filter((rect) => rect.width && rect.height);
  if (!clientRects.length) return null;

  let top = Infinity;
  let left = Infinity;
  let bottom = -Infinity;
  let right = -Infinity;

  clientRects.forEach((rect) => {
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    bottom = Math.max(bottom, rect.bottom);
    right = Math.max(right, rect.right);
  });

  if (!Number.isFinite(top) || !Number.isFinite(left) || !Number.isFinite(bottom) || !Number.isFinite(right)) {
    return null;
  }

  const zoomFactor = activeZoom.value ? activeZoom.value / 100 : 1;
  const pageRect = pageElement.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const bounds = {
    top: (top - pageRect.top) / zoomFactor,
    left: (left - pageRect.left) / zoomFactor,
    bottom: (bottom - pageRect.top) / zoomFactor,
    right: (right - pageRect.left) / zoomFactor,
  };

  bounds.top += PDF_SELECTION_OFFSET;
  bounds.bottom += PDF_SELECTION_OFFSET;

  const page = Number(pageElement.dataset.pageNumber || 1);
  const pageOffset = {
    top: (pageRect.top - containerRect.top) / zoomFactor + container.scrollTop,
    left: (pageRect.left - containerRect.left) / zoomFactor + container.scrollLeft,
  };

  return { bounds, page, pageOffset };
};

const handlePdfClick = (e) => {
  const { target } = e;
  if (target.tagName !== 'SPAN') {
    emit('bypass-selection', e);
  }
};

const handleMouseUp = (e) => {
  const selection = window.getSelection();
  if (selection.toString().length > 0) {
    const info = getSelectedTextInfo(viewer.value);
    if (!info) return;
    const { bounds: selectionBounds, page, pageOffset } = info;
    const sel = useSelection({
      selectionBounds,
      documentId: id,
      page,
      source: 'pdf-viewer',
      pageOffset,
    });
    emit('selection-change', sel);
  }
};

onMounted(async () => {
  await loadPDF(pdfData);
});

onUnmounted(() => {
  pdfAdapter.destroy();
});
</script>

<template>
  <div class="superdoc-pdf-viewer-container" @mousedown="handlePdfClick" @mouseup="handleMouseUp">
    <div class="superdoc-pdf-viewer" ref="viewer" id="viewerId"></div>

    <div v-if="!isReady" class="superdoc-pdf-viewer__loader">
      <n-spin class="superdoc-pdf-viewer__spin" size="large" />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.superdoc-pdf-viewer-container {
  width: 100%;
}

.superdoc-pdf-viewer {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
}

.superdoc-pdf-viewer__loader {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-width: 150px;
  min-height: 150px;
}

.superdoc-pdf-viewer__loader :deep(.n-spin) {
  --n-color: #1354ff !important;
  --n-text-color: #1354ff !important;
}

.superdoc-pdf-viewer :deep(.pdf-page) {
  position: relative;
  margin: 0 0 24px 0;
  border: 1px solid #d3d3d3;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 0 5px hsla(0, 0%, 0%, 0.05);
  overflow: hidden;
}

.superdoc-pdf-viewer :deep(.textLayer) {
  z-index: 2;
  position: absolute;
}

.superdoc-pdf-viewer :deep(.textLayer)::selection {
  background-color: #1355ff66;
  mix-blend-mode: difference;
}
</style>
