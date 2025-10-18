<script setup>
import '@/assets/styles/elements/prosemirror.css';
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { getFileObject } from 'superdoc';
import { MeasurementEngine, Editor, getStarterExtensions } from '@measurement-engine';
import defaultFile from '/sdpr.docx?url';
import Ruler from './Ruler.vue';

const editor = shallowRef(null);
const engine = shallowRef(null);
const fileSource = ref(null);
const editorElement = ref(null);
const measurementEditor = ref(null);
const lastPageBreaks = ref([]);
const pageBreakMarkers = ref([]);
const isLoadingDocument = ref(false);
const currentObjectUrl = ref(null);
const activeTab = ref('editor');

const headerFooterState = ref(createHeaderFooterState());
const repositoryPollHandle = ref(null);
let markerAnimationFrame = null;
let markerAnimationUsingTimeout = false;

/**
 * Array of page break lines with their vertical offsets in pixels.
 */
const resolveBreakIdentifier = (entry, fallbackIndex) => {
  const primaryBreak = entry?.break ?? null;
  const pageIndex = Number.isFinite(entry?.pageIndex) ? entry.pageIndex : fallbackIndex;
  const pos = Number.isFinite(primaryBreak?.pos) ? primaryBreak.pos : null;
  return `${pageIndex}-${pos ?? fallbackIndex}`;
};

const resolveBreakTopOffset = (entry, fallbackIndex) => {
  const primaryBreak = entry?.break ?? null;
  const boundary = entry?.boundary ?? {};
  const pageIndex = Number.isFinite(entry?.pageIndex) ? entry.pageIndex : fallbackIndex;
  const marginTop = Number.isFinite(boundary?.marginsPx?.top) ? boundary.marginsPx.top : 0;
  const stride = Number.isFinite(boundary?.usableHeightPx)
    ? boundary.usableHeightPx
    : Number.isFinite(boundary?.pageHeightPx)
      ? boundary.pageHeightPx
      : 0;

  const topCandidates = [primaryBreak?.fittedTop, primaryBreak?.top, primaryBreak?.bottom, primaryBreak?.fittedBottom];

  const breakTop = topCandidates.find((value) => Number.isFinite(value)) ?? null;
  if (!Number.isFinite(breakTop)) return null;

  const verticalOffset = marginTop + pageIndex * stride + breakTop;
  return Number.isFinite(verticalOffset) ? verticalOffset : null;
};

const pageBreakLines = computed(() => {
  if (!Array.isArray(lastPageBreaks.value)) return [];

  return lastPageBreaks.value
    .map((entry, index) => {
      const primaryBreak = entry?.break ?? null;
      if (!primaryBreak) return null;

      const verticalOffset = resolveBreakTopOffset(entry, index);
      if (!Number.isFinite(verticalOffset)) return null;

      const key = resolveBreakIdentifier(entry, index);

      return {
        id: key,
        top: verticalOffset,
      };
    })
    .filter(Boolean);
});

const clearMarkerAnimation = () => {
  if (markerAnimationFrame === null) return;

  if (markerAnimationUsingTimeout) {
    clearTimeout(markerAnimationFrame);
  } else {
    cancelAnimationFrame(markerAnimationFrame);
  }
  markerAnimationFrame = null;
  markerAnimationUsingTimeout = false;
};

const getBreakCoords = (view, pos) => {
  if (!view || !Number.isFinite(pos)) return null;
  const docSize = Number.isFinite(view.state?.doc?.content?.size) ? view.state.doc.content.size : 0;
  const clamped = Math.max(0, Math.min(pos, docSize));
  const clampToDoc = (value) => Math.max(0, Math.min(docSize, value));
  const base = clampToDoc(clamped);
  const before = clampToDoc(base - 1);
  const after = clampToDoc(base + 1);
  const attempts = [
    { pos: after, side: -1 },
    { pos: after, side: 1 },
    { pos: base, side: 1 },
    { pos: base, side: -1 },
    { pos: before, side: 1 },
    { pos: before, side: -1 },
  ];
  const seen = new Set();

  for (const { pos: candidatePos, side } of attempts) {
    const key = `${candidatePos}:${side}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const coords = view.coordsAtPos(candidatePos, side);
      if (coords && Number.isFinite(coords.top) && Number.isFinite(coords.left)) {
        return coords;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
};

const updatePageBreakMarkers = async () => {
  const measurementView = engine.value?.measurementEditor?.view ?? null;
  const surfaceEl = measurementEditor.value ?? null;

  if (!measurementView || !surfaceEl) {
    pageBreakMarkers.value = [];
    return;
  }

  await nextTick();

  const surfaceRect = surfaceEl.getBoundingClientRect();
  const scrollLeft = surfaceEl.scrollLeft ?? 0;
  const lineLookup = new Map(pageBreakLines.value.map((line) => [line.id, line.top]));

  const markers = lastPageBreaks.value
    .map((entry, index) => {
      const pos = Number.isFinite(entry?.break?.pos) ? entry.break.pos : null;
      if (!Number.isFinite(pos)) return null;

      const coords = getBreakCoords(measurementView, pos);
      if (!coords) return null;

      const identifier = resolveBreakIdentifier(entry, index);
      const verticalOffset = lineLookup.get(identifier) ?? resolveBreakTopOffset(entry, index);
      const fallbackTop = coords.top - surfaceRect.top;
      const markerTop = Number.isFinite(verticalOffset) ? verticalOffset : fallbackTop;

      const localLeft = coords.left - surfaceRect.left + scrollLeft;
      if (!Number.isFinite(markerTop) || !Number.isFinite(localLeft)) return null;

      return {
        id: identifier,
        top: markerTop,
        left: localLeft,
      };
    })
    .filter(Boolean);

  pageBreakMarkers.value = markers;
};

const scheduleMarkerUpdate = () => {
  clearMarkerAnimation();
  const useRaf = typeof requestAnimationFrame === 'function';
  markerAnimationUsingTimeout = !useRaf;
  markerAnimationFrame = useRaf
    ? requestAnimationFrame(() => {
        markerAnimationFrame = null;
        markerAnimationUsingTimeout = false;
        updatePageBreakMarkers();
      })
    : setTimeout(() => {
        markerAnimationFrame = null;
        markerAnimationUsingTimeout = false;
        updatePageBreakMarkers();
      }, 16);
};

function createHeaderFooterState() {
  return {
    headers: [],
    footers: [],
    variants: {
      header: [],
      footer: [],
    },
    contentWidthPx: 816,
    distancesPx: { header: 0, footer: 0 },
  };
}

const formatPixels = (value) => (Number.isFinite(value) ? `${value.toFixed(1)} px` : 'n/a');

const updateHeaderFooterSummary = () => {
  const repo = editor.value?.storage?.pagination?.repository;
  const summary = engine.value?.getHeaderFooterSummary?.();

  if (!repo || !summary) {
    headerFooterState.value = createHeaderFooterState();
    return;
  }

  const metricsById = summary.sectionMetricsById ?? new Map();
  const toDisplay = (type) =>
    (repo.list?.(type) ?? []).map((record) => ({
      id: record.id,
      type,
      metrics: metricsById.get(record.id) ?? null,
      variants: Array.isArray(record.meta?.variants) ? record.meta.variants : [],
      contentJson: record.contentJson,
      raw: record,
    }));

  headerFooterState.value = {
    headers: toDisplay('header'),
    footers: toDisplay('footer'),
    variants: {
      header: Array.from(summary.variantLookup?.header ?? []),
      footer: Array.from(summary.variantLookup?.footer ?? []),
    },
    contentWidthPx: Number.isFinite(summary.contentWidthPx) ? summary.contentWidthPx : 816,
    distancesPx: summary.distancesPx ?? { header: 0, footer: 0 },
  };
};

const hasHeaderFooterContent = computed(
  () => headerFooterState.value.headers.length > 0 || headerFooterState.value.footers.length > 0,
);

const toFileObject = async (source) => {
  if (typeof File !== 'undefined' && source instanceof File) {
    if (currentObjectUrl.value) {
      URL.revokeObjectURL(currentObjectUrl.value);
      currentObjectUrl.value = null;
    }

    const objectUrl = URL.createObjectURL(source);
    currentObjectUrl.value = objectUrl;

    return getFileObject(
      objectUrl,
      source.name,
      source.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  }

  return getFileObject(source);
};

const loadEditorData = async (source) => {
  fileSource.value = await toFileObject(source);
  const [docx, media, mediaFiles, fonts] = await Editor.loadXmlData(fileSource.value);
  return { content: docx, media, mediaFiles, fonts };
};

const teardownHarness = () => {
  editor.value?.destroy?.();
  editor.value = null;
  engine.value = null;

  if (repositoryPollHandle.value) {
    clearInterval(repositoryPollHandle.value);
    repositoryPollHandle.value = null;
  }

  if (editorElement.value) {
    editorElement.value.innerHTML = '';
  }

  if (measurementEditor.value) {
    measurementEditor.value.innerHTML = '';
  }

  if (currentObjectUrl.value) {
    URL.revokeObjectURL(currentObjectUrl.value);
    currentObjectUrl.value = null;
  }

  clearMarkerAnimation();
  lastPageBreaks.value = [];
  pageBreakMarkers.value = [];
  headerFooterState.value = createHeaderFooterState();
  activeTab.value = 'editor';
};

const initMeasurementHarness = async (source = defaultFile) => {
  if (isLoadingDocument.value) return;

  isLoadingDocument.value = true;
  try {
    teardownHarness();

    const { content, media, mediaFiles, fonts } = await loadEditorData(source);

    editor.value = new Editor({
      element: editorElement.value,
      fileSource: fileSource.value,
      extensions: getStarterExtensions(),
      content,
      media,
      mediaFiles,
      fonts,
      pagination: true,
      annotations: true,
    });

    initMeasurementEngine();
    scheduleMarkerUpdate();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize measurement harness', error);
  } finally {
    isLoadingDocument.value = false;
  }
};

const initMeasurementEngine = () => {
  const repository = editor.value?.storage?.pagination?.repository ?? null;
  const engineConfig = {
    editor: editor.value,
    element: measurementEditor.value,
    onPageBreaksUpdate: (breaks) => {
      lastPageBreaks.value = breaks;
      updateHeaderFooterSummary();
    },
    headerFooterRepository: repository,
  };
  engine.value = new MeasurementEngine(engineConfig);
  lastPageBreaks.value = engine.value.pageBreaks;
  updateHeaderFooterSummary();

  if (repository && engine.value?.refreshHeaderFooterMeasurements) {
    engine.value.refreshHeaderFooterMeasurements().then(() => {
      updateHeaderFooterSummary();
    });
  }

  startRepositoryPolling();
};

watch(
  () => editor.value?.storage?.pagination?.repository,
  async (repo, _, onCleanup) => {
    if (!engine.value || !repo) {
      return;
    }

    engine.value.headerFooterRepository = repo;
    if (typeof engine.value.refreshHeaderFooterMeasurements === 'function') {
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });
      await engine.value.refreshHeaderFooterMeasurements();
      if (!cancelled) {
        updateHeaderFooterSummary();
      }
    } else {
      updateHeaderFooterSummary();
    }
  },
  { immediate: true },
);

const hasHeaderFooterVariants = computed(
  () => headerFooterState.value.variants.header.length > 0 || headerFooterState.value.variants.footer.length > 0,
);

const startRepositoryPolling = () => {
  if (repositoryPollHandle.value) return;
  repositoryPollHandle.value = setInterval(() => {
    const repo = editor.value?.storage?.pagination?.repository;
    if (repo && engine.value) {
      clearInterval(repositoryPollHandle.value);
      repositoryPollHandle.value = null;
      engine.value.headerFooterRepository = repo;
      if (typeof engine.value.refreshHeaderFooterMeasurements === 'function') {
        engine.value.refreshHeaderFooterMeasurements().then(() => {
          updateHeaderFooterSummary();
        });
      } else {
        updateHeaderFooterSummary();
      }
    }
  }, 400);
};

const onWindowResize = () => {
  scheduleMarkerUpdate();
};

watch(
  lastPageBreaks,
  () => {
    scheduleMarkerUpdate();
  },
  { deep: true },
);

watch(
  () => measurementEditor.value,
  () => {
    scheduleMarkerUpdate();
  },
);

watch(engine, () => {
  scheduleMarkerUpdate();
});

const HeaderFooterPreview = defineComponent({
  name: 'HeaderFooterPreview',
  props: {
    record: { type: Object, required: true },
    parentEditor: { type: Object, required: true },
    pageWidthPx: { type: Number, default: 816 },
  },
  setup(props) {
    const containerRef = ref(null);
    let previewEditor = null;

    const metrics = () => props.record.metrics ?? {};

    const applyMetricsToContainer = () => {
      const container = containerRef.value;
      if (!container) return;

      const { distancePx = 0, effectiveHeightPx = 0 } = metrics();
      // Mirror Word: header content starts headerDistance below page top, footer content sits
      // footerDistance above the bottom edge. We visualize that spacing by applying padding
      // around the preview editor so developers can see how much vertical budget the header
      // or footer consumes on the page.
      container.style.minHeight = `${Math.max(effectiveHeightPx, 200)}px`;
      container.style.paddingTop = props.record.type === 'header' ? `${distancePx}px` : '0px';
      container.style.paddingBottom = props.record.type === 'footer' ? `${distancePx}px` : '0px';

      if (props.record.type === 'footer') {
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = 'flex-end';
      } else {
        container.style.display = 'block';
      }
    };

    const applyMetricsToEditor = () => {
      if (!previewEditor?.view?.dom) return;
      const { contentHeightPx = 0 } = metrics();
      previewEditor.view.dom.classList.add('hf-preview-editor');
      previewEditor.view.dom.style.setProperty('padding', '18px');
      previewEditor.view.dom.style.setProperty('min-height', `${Math.max(contentHeightPx, 120)}px`);
    };

    const instantiate = () => {
      if (!containerRef.value || !props.parentEditor) return;

      if (previewEditor) {
        previewEditor.destroy?.();
        previewEditor = null;
      }

      try {
        if (Number.isFinite(props.pageWidthPx)) {
          containerRef.value.style.width = `${props.pageWidthPx}px`;
        }
        containerRef.value.classList.add('super-editor', 'hf-preview-surface');
        applyMetricsToContainer();

        const extensions = getStarterExtensions().filter((extension) => extension?.name !== 'pagination');
        previewEditor = new Editor({
          element: containerRef.value,
          loadFromSchema: true,
          content: props.record.contentJson,
          extensions,
          pagination: false,
          editable: false,
          isHeaderOrFooter: true,
          parentEditor: props.parentEditor,
          role: 'viewer',
          documentMode: 'viewing',
          fonts: props.parentEditor.options?.fonts ?? {},
          media: props.parentEditor.options?.media ?? {},
          mediaFiles: props.parentEditor.options?.mediaFiles ?? {},
        });
        previewEditor.setEditable?.(false, false);
        applyMetricsToEditor();
      } catch (error) {}
    };

    const refreshEditorMetrics = () => {
      applyMetricsToContainer();
      applyMetricsToEditor();
    };

    onMounted(() => {
      nextTick(instantiate);
    });

    watch(
      () => props.parentEditor,
      () => {
        nextTick(instantiate);
      },
    );

    watch(
      () => props.record.contentJson,
      (content) => {
        if (!previewEditor) {
          nextTick(instantiate);
          return;
        }
        if (typeof previewEditor.replaceContent === 'function' && content) {
          previewEditor.replaceContent(content);
        }
        previewEditor?.setEditable?.(false, false);
        nextTick(refreshEditorMetrics);
      },
      { deep: true },
    );

    watch(
      () => props.pageWidthPx,
      (width) => {
        if (containerRef.value && Number.isFinite(width)) {
          containerRef.value.style.width = `${width}px`;
        }
        nextTick(instantiate);
      },
    );

    watch(
      () => props.record.metrics,
      () => {
        nextTick(refreshEditorMetrics);
      },
      { immediate: true, deep: true },
    );

    onBeforeUnmount(() => {
      previewEditor?.destroy?.();
      previewEditor = null;
    });

    return () =>
      h('div', {
        ref: containerRef,
        class: 'hf-preview',
        style: {
          width: Number.isFinite(props.pageWidthPx) ? `${props.pageWidthPx}px` : '816px',
          minHeight: Number.isFinite(metrics().effectiveHeightPx)
            ? `${Math.max(metrics().effectiveHeightPx, 200)}px`
            : '200px',
        },
        'data-record-id': props.record.id,
        'data-record-type': props.record.type,
      });
  },
});

onMounted(() => {
  window.addEventListener('resize', onWindowResize);
  initMeasurementHarness();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  teardownHarness();
  clearMarkerAnimation();
});

defineExpose({
  loadDocument: initMeasurementHarness,
  isLoadingDocument,
});
</script>

<template>
  <div class="editor-container">
    <div class="panel-tabs" role="tablist">
      <button
        type="button"
        class="panel-tab"
        :class="{ active: activeTab === 'editor' }"
        @click="activeTab = 'editor'"
        role="tab"
        :aria-selected="activeTab === 'editor'"
      >
        Editor
      </button>
      <button
        type="button"
        class="panel-tab"
        :class="{ active: activeTab === 'headers' }"
        @click="activeTab = 'headers'"
        role="tab"
        :aria-selected="activeTab === 'headers'"
      >
        Headers &amp; Footers
      </button>
    </div>

    <div class="stage-content">
      <Ruler />

      <div class="editor measurement-wrapper">
        <div class="page-break-overlay">
          <div
            v-for="line in pageBreakLines"
            :key="line.id"
            class="page-break-line"
            :style="{ top: `${line.top}px` }"
          ></div>
          <div
            v-for="marker in pageBreakMarkers"
            :key="`marker-${marker.id}`"
            class="page-break-marker"
            :style="{ top: `${marker.top}px`, left: `${marker.left}px` }"
          ></div>
        </div>
        <div ref="measurementEditor" class="measurement-surface"></div>
      </div>

      <div class="editor-panel">
        <div class="panel-body">
          <div v-show="activeTab === 'editor'" class="panel-section" role="tabpanel">
            <div ref="editorElement" class="editor main-editor"></div>
          </div>

          <div v-show="activeTab === 'headers'" class="panel-section headers" role="tabpanel">
            <div v-if="!hasHeaderFooterContent" class="empty-state">
              <p>No header or footer content detected for this document.</p>
            </div>

            <div v-else class="headers-footers">
              <section
                class="variant-summary"
                v-if="
                  hasHeaderFooterVariants ||
                  headerFooterState.distancesPx.header ||
                  headerFooterState.distancesPx.footer
                "
              >
                <div class="variant-column" v-if="headerFooterState.variants.header.length">
                  <h3>Header Variants</h3>
                  <ul>
                    <li v-for="[variant, id] in headerFooterState.variants.header" :key="`header-variant-${variant}`">
                      <span class="variant-key">{{ variant }}</span>
                      <span class="variant-id">{{ id }}</span>
                    </li>
                  </ul>
                </div>
                <div class="variant-column" v-if="headerFooterState.variants.footer.length">
                  <h3>Footer Variants</h3>
                  <ul>
                    <li v-for="[variant, id] in headerFooterState.variants.footer" :key="`footer-variant-${variant}`">
                      <span class="variant-key">{{ variant }}</span>
                      <span class="variant-id">{{ id }}</span>
                    </li>
                  </ul>
                </div>
                <div class="variant-column distance-meta">
                  <h3>Distances</h3>
                  <p>Header distance: {{ formatPixels(headerFooterState.distancesPx.header) }}</p>
                  <p>Footer distance: {{ formatPixels(headerFooterState.distancesPx.footer) }}</p>
                </div>
              </section>

              <section class="hf-group" v-if="headerFooterState.headers.length">
                <h2>Headers</h2>
                <div class="hf-grid">
                  <article v-for="record in headerFooterState.headers" :key="record.id" class="hf-card">
                    <header class="hf-card-header">
                      <div>
                        <h3>{{ record.id }}</h3>
                        <p class="hf-meta">
                          Content: {{ formatPixels(record.metrics?.contentHeightPx) }} · Distance:
                          {{ formatPixels(record.metrics?.distancePx) }} · Effective:
                          {{ formatPixels(record.metrics?.effectiveHeightPx) }}
                        </p>
                      </div>
                      <div v-if="record.variants?.length" class="hf-badges">
                        <span
                          v-for="variant in record.variants"
                          :key="`${record.id}-variant-${variant}`"
                          class="hf-badge"
                        >
                          {{ variant }}
                        </span>
                      </div>
                    </header>
                    <HeaderFooterPreview
                      :record="record"
                      :parent-editor="editor"
                      :page-width-px="headerFooterState.contentWidthPx"
                    />
                  </article>
                </div>
              </section>

              <section class="hf-group" v-if="headerFooterState.footers.length">
                <h2>Footers</h2>
                <div class="hf-grid">
                  <article v-for="record in headerFooterState.footers" :key="record.id" class="hf-card">
                    <header class="hf-card-header">
                      <div>
                        <h3>{{ record.id }}</h3>
                        <p class="hf-meta">
                          Content: {{ formatPixels(record.metrics?.contentHeightPx) }} · Distance:
                          {{ formatPixels(record.metrics?.distancePx) }} · Effective:
                          {{ formatPixels(record.metrics?.effectiveHeightPx) }}
                        </p>
                      </div>
                      <div v-if="record.variants?.length" class="hf-badges">
                        <span
                          v-for="variant in record.variants"
                          :key="`${record.id}-variant-${variant}`"
                          class="hf-badge"
                        >
                          {{ variant }}
                        </span>
                      </div>
                    </header>
                    <HeaderFooterPreview
                      :record="record"
                      :parent-editor="editor"
                      :page-width-px="headerFooterState.contentWidthPx"
                    />
                  </article>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stage-content {
  display: flex;
  flex: 1;
  flex-direction: row;
  gap: 16px;
  justify-content: flex-start;
}

.editor-panel {
  display: flex;
  min-width: 8.5in;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(10, 15, 27, 0.92);
  box-shadow: 0 22px 48px rgba(5, 10, 22, 0.48);
}

.panel-tabs {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  flex-wrap: wrap;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 255, 0.24);
  background: linear-gradient(135deg, rgba(19, 24, 39, 0.88), rgba(21, 33, 55, 0.78));
  box-shadow: 0 18px 40px rgba(6, 12, 26, 0.45);
}

.panel-tab {
  flex: 1;
  padding: 14px 18px;
  background: transparent;
  border: none;
  color: rgba(226, 232, 255, 0.75);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.panel-tab:hover {
  background: rgba(148, 163, 255, 0.08);
  color: #e6ecff;
}

.panel-tab.active {
  background: rgba(148, 163, 255, 0.18);
  color: #ffffff;
}

.panel-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 20px 24px;
  overflow: auto;
}

.panel-section.headers {
  gap: 18px;
  padding-top: 20px;
}

.measurement-wrapper {
  position: relative;
  flex: 0 1 816px;
  max-width: 816px;
  background: rgba(10, 15, 27, 0.92);
  box-shadow: 0 22px 48px rgba(5, 10, 22, 0.48);
  background-color: white;
}

.page-break-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.page-break-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #f97316 0%, #fb923c 100%);
  opacity: 1;
}

.page-break-marker {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 15;
}

.page-break-marker::before {
  content: '';
  position: absolute;
  width: 6px;
  height: 18px;
  border-radius: 3px;
  background: linear-gradient(180deg, #dc2626 0%, #f87171 100%);
  box-shadow:
    0 0 0 1px rgba(220, 38, 38, 0.55),
    0 6px 12px rgba(220, 38, 38, 0.25);
  transform: translate(-50%, -50%);
}

.headers-footers {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.variant-summary {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  background: rgba(148, 163, 255, 0.08);
  padding: 16px;
  border-radius: 12px;
}

.variant-column {
  min-width: 180px;
}

.variant-column.distance-meta p {
  margin: 0;
  font-size: 12px;
  color: rgba(226, 232, 255, 0.7);
}

.variant-column h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #e6ecff;
}

.variant-column ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.variant-key {
  display: inline-block;
  min-width: 64px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: rgba(226, 232, 255, 0.75);
}

.variant-id {
  font-size: 12px;
  color: rgba(226, 232, 255, 0.55);
}

.hf-group h2 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #f4f6ff;
}

.hf-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hf-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(14, 22, 38, 0.92);
  border: 1px solid rgba(148, 163, 255, 0.18);
  box-shadow: 0 16px 32px rgba(5, 10, 22, 0.38);
  min-width: 840px;
}

.hf-card-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.hf-card-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #f1f5ff;
}

.hf-meta {
  margin: 4px 0 0;
  font-size: 12px;
  color: rgba(226, 232, 255, 0.8);
}

.hf-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hf-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 255, 0.2);
  color: #dbe2ff;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.hf-preview {
  min-height: 200px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
  color: #0f172a;
  position: relative;
}

.hf-preview-surface {
  min-height: 200px;
}

.hf-preview :deep(.ProseMirror) {
  color: #0f172a;
  padding: 18px;
  min-height: 180px;
}

.empty-state {
  flex: 1;
  display: grid;
  place-items: center;
  color: rgba(226, 232, 255, 0.7);
  font-size: 14px;
  padding: 24px;
  min-width: 700px;
  text-align: center;
}
</style>
