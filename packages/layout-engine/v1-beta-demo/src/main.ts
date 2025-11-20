import './style.css';
import './app-header.css';
import '@superdoc/common/styles/common-styles.css';
import '@harbour-enterprises/super-editor/style.css';

import { SuperDoc } from 'superdoc';
import { PresentationEditor } from '@harbour-enterprises/super-editor';
import type { LayoutMode } from '@superdoc/painter-dom';
import type { ColumnLayout } from '@superdoc/contracts';
import { perfClear, perfReport, perfSummary } from './performance';
import { VerticalRulerManager } from './vertical-ruler';
import type { ImportMeta, ContentErrorPayload, LayoutPipelinePayload } from './types';
import imageDocUrl from './assets/image-inline-and-block.docx?url';
import paragraphDocUrl from './assets/basic-paragraph.docx?url';
import twoColumnDocUrl from './assets/two_column_two_page.docx?url';
import basicPageNumsUrl from '../../../super-editor/src/tests/data/basic-page-nums.docx?url';
import pageNumberingExamplesUrl from '../../../super-editor/src/tests/data/page-numbering-examples.docx?url';
import basicListDocUrl from '../../../super-editor/src/tests/data/basic-list.docx?url';
import hfNormalUrl from '../../../super-editor/src/tests/data/h_f-normal.docx?url';
import hfOddEvenUrl from '../../../super-editor/src/tests/data/h_f-normal-odd-even.docx?url';
import hfFirstOddEvenUrl from '../../../super-editor/src/tests/data/h_f-normal-odd-even-firstpg.docx?url';
import hfAllOffUrl from '../../../super-editor/src/tests/data/h_f-normal-odd-even-unchecked-first-pg-unchecked.docx?url';
import paragraphPPrVariationsUrl from '../../../super-editor/src/tests/data/paragraph_pPr_variations.docx?url';
import basicTrackedChangeUrl from '../../../super-editor/src/tests/data/basic-tracked-change.docx?url';
import annot2Url from '../../../super-editor/src/tests/data/annot2.docx?url';
import vectorsDocUrl from '../../test-fixtures/shapes/vectors.docx?url';
import multiSectionDocUrl from '../../../super-editor/src/tests/data/multi_section_doc.docx?url';
import runsBasicColors from '../../../super-editor/src/tests/data/ooxml-color-rstyle-linked-combos-demo.docx?url';
import sdTableTester from '../../../super-editor/src/tests/data/superdoc_table_tester.docx?url';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DEMO_DOC_ID = 'v1-beta-demo-doc';
const DEFAULT_VIRTUALIZATION = { enabled: true, window: 5, overscan: 1, gap: 24 } as const;

const SAMPLE_DOCS = [
  { id: 'multi-section', label: 'Multi-Section Document', url: multiSectionDocUrl },
  { id: 'basic-tracked-change', label: 'Basic Tracked Change', url: basicTrackedChangeUrl },
  { id: 'vectors', label: 'Vector Shapes', url: vectorsDocUrl },
  { id: 'basic-page-nums', label: 'Basic Page Numbers', url: basicPageNumsUrl },
  { id: 'header-footer-normal', label: 'Header/Footer: Normal', url: hfNormalUrl },
  { id: 'header-footer-odd-even', label: 'Header/Footer: Odd/Even', url: hfOddEvenUrl },
  { id: 'header-footer-first-odd-even', label: 'Header/Footer: First Page + Odd/Even', url: hfFirstOddEvenUrl },
  { id: 'header-footer-all-off', label: 'Header/Footer: All Options Off', url: hfAllOffUrl },
  { id: 'two-column', label: 'Two Column Layout', url: twoColumnDocUrl },
  { id: 'image', label: 'Images + Captions', url: imageDocUrl },
  { id: 'paragraph', label: 'Basic Paragraph', url: paragraphDocUrl },
  { id: 'basic-list', label: 'Basic Lists', url: basicListDocUrl },
  { id: 'page-numbering-examples', label: 'Page Numbering Examples', url: pageNumberingExamplesUrl },
  { id: 'paragraph-ppr', label: 'Paragraph Formatting Variations', url: paragraphPPrVariationsUrl },
  { id: 'annot2', label: 'Field Annotations & SDT Metadata', url: annot2Url },
  { id: 'runs-basic-colors', label: 'Runs tests', url: runsBasicColors },
  { id: 'sd-table-tester', label: 'Basic table tester', url: sdTableTester },
];

let superdocInstance: SuperDoc | null = null;
let currentLayoutMode: LayoutMode = 'vertical';
let currentDocName = '';
let statusEl: HTMLElement | null = null;
let exportBtn: HTMLButtonElement | null = null;
let fileInput: HTMLInputElement | null = null;
let controlsContainer: HTMLElement | null = null;
let toolbarToggleBtn: HTMLButtonElement | null = null;
let layoutModeSelect: HTMLSelectElement | null = null;
let sampleSelect: HTMLSelectElement | null = null;
let layoutHost: HTMLElement;
let superdocMount: HTMLElement;
let verticalRuler: VerticalRulerManager | null = null;
let controlsCollapsed = false;

const isDebugMode = new URLSearchParams(location.search).has('debug');
const isTestMode = new URLSearchParams(location.search).has('test') || (import.meta as ImportMeta).env?.MODE === 'test';

bootstrap().catch((error) => {
  console.error(error);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<pre class="error">${error instanceof Error ? error.message : String(error)}</pre>`;
  }
});

async function bootstrap() {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app container not found');

  controlsCollapsed = getStoredFlag('layoutDemo.controlsCollapsed');

  layoutHost = document.createElement('div');
  layoutHost.id = 'layout-root';
  superdocMount = document.createElement('div');
  superdocMount.id = 'superdoc-root';
  layoutHost.appendChild(superdocMount);

  const header = createHeader();
  const controls = createControls();
  const toolbar = createToolbar();
  const footer = createFooter();

  const layoutWrapper = document.createElement('div');
  layoutWrapper.className = 'layout-stack';
  layoutWrapper.appendChild(layoutHost);

  app.innerHTML = '';
  app.append(header, controls, toolbar, layoutWrapper, footer);
  applyControlsCollapsedState();

  await loadInitialDocument();
  setupDebugApi();
  setupTestApi();
}

function createHeader(): HTMLElement {
  const wrapper = document.createElement('header');
  wrapper.className = 'app-header';

  const logo = document.createElement('div');
  logo.className = 'logo';
  const logoImg = document.createElement('img');
  logoImg.src = new URL('./assets/superdoc-logo.webp', import.meta.url).href;
  logoImg.alt = 'SuperDoc Logo';
  logo.appendChild(logoImg);

  const meta = document.createElement('div');
  meta.className = 'meta';

  const chip = document.createElement('span');
  chip.className = 'chip';
  chip.textContent = 'SUPERDOC LABS';

  const title = document.createElement('h1');
  title.textContent = 'SuperDoc v1 Beta';

  const sub = document.createElement('p');
  sub.className = 'header-description';
  sub.innerHTML = `
    <p>Meet our new virtualized performance-first layout engine, built for speed and precision.</p>
    <ul>
      <li>Load massive documents (≤500 pages) in under 1 second</li>
      <li>True page rendering with no hidden layers</li>
      <li>Multi-column layout support</li>
    </ul>
  `;

  meta.append(chip, title, sub);

  const betaNotice = document.createElement('div');
  betaNotice.className = 'header-beta-notice';
  betaNotice.innerHTML =
    '<strong>Early beta:</strong> Basic editing enabled. Continuous updates throughout November will improve rendering, context menus, and add ruler features.';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'toolbar-toggle';
  toolbarToggleBtn = toggle;
  toggle.addEventListener('click', () => {
    controlsCollapsed = !controlsCollapsed;
    setStoredFlag('layoutDemo.controlsCollapsed', controlsCollapsed);
    applyControlsCollapsedState();
  });

  wrapper.append(logo, meta, betaNotice, toggle);
  return wrapper;
}

function createControls(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'controls';
  container.id = 'controls';
  controlsContainer = container;

  const leftGroup = document.createElement('div');
  leftGroup.className = 'control-actions control-actions--left';
  const rightGroup = document.createElement('div');
  rightGroup.className = 'control-actions control-actions--right';

  layoutModeSelect = document.createElement('select');
  layoutModeSelect.id = 'layout-mode-select';
  layoutModeSelect.className = 'layout-mode-select';
  layoutModeSelect.innerHTML = `
    <option value="vertical">📄 Normal Layout</option>
    <option value="book">📖 Book</option>
    <option value="horizontal">↔️ Horizontal</option>
  `;
  layoutModeSelect.value = currentLayoutMode;
  layoutModeSelect.addEventListener('change', () => {
    const nextMode = layoutModeSelect?.value as LayoutMode;
    setLayoutMode(nextMode);
  });

  fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.docx';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', async () => {
    const file = fileInput?.files?.[0];
    if (file) {
      await handleDocxSelection(file);
    }
    if (fileInput) fileInput.value = '';
  });

  const loadBtn = document.createElement('button');
  loadBtn.type = 'button';
  loadBtn.className = 'secondary-button';
  loadBtn.textContent = 'Upload DOCX';
  loadBtn.addEventListener('click', () => fileInput?.click());

  exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'export-button';
  exportBtn.textContent = 'Export DOCX';
  exportBtn.disabled = true;
  exportBtn.addEventListener('click', handleDocxExport);

  statusEl = document.createElement('span');
  statusEl.className = 'status';
  statusEl.textContent = 'Loading…';

  const sampleSelector = document.createElement('div');
  sampleSelector.className = 'sample-selector';
  const selectorLabel = document.createElement('label');
  selectorLabel.textContent = 'Sample Files: ';
  selectorLabel.htmlFor = 'sample-file-select';
  sampleSelect = document.createElement('select');
  sampleSelect.id = 'sample-file-select';
  sampleSelect.innerHTML = `
    <option value="">-- Select Sample --</option>
    ${SAMPLE_DOCS.map((sample) => `<option value="${sample.id}">${sample.label}</option>`).join('')}
  `;
  sampleSelect.addEventListener('change', async () => {
    if (!sampleSelect) return;
    const value = sampleSelect.value;
    if (!value) return;
    await loadSampleFile(value);
  });

  sampleSelector.append(selectorLabel, sampleSelect);

  leftGroup.append(layoutModeSelect, sampleSelector);
  rightGroup.append(loadBtn, exportBtn, statusEl);
  container.append(leftGroup, rightGroup);
  return container;
}

function createToolbar(): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.id = 'superdoc-toolbar';
  toolbar.className = 'sd-toolbar';
  return toolbar;
}

function createFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'app-footer';
  const notice = document.createElement('p');
  notice.innerHTML = `<strong>Note:</strong> Beta features can change during the beta period. Email <a href="mailto:support@superdoc.dev">support@superdoc.dev</a> if you spot a bug.`;
  footer.appendChild(notice);
  return footer;
}

async function loadInitialDocument() {
  const candidates = [
    'sd-table-tester',
    'multi-section',
    'runs-basic-colors',
    'paragraph-ppr',
    'basic-tracked-change',
    'vectors',
    'basic-page-nums',
    'paragraph',
    'image',
    'two-column',
  ];
  for (const id of candidates) {
    try {
      await loadSampleFile(id);
      sampleSelect && (sampleSelect.value = id);
      return;
    } catch (error) {
      console.warn('Failed to load starter document', id, error);
    }
  }
  setStatus('Failed to load starter documents. Try uploading a DOCX.');
}

async function loadSampleFile(sampleId: string) {
  const sample = SAMPLE_DOCS.find((item) => item.id === sampleId);
  if (!sample) {
    console.error('Unknown sample', sampleId);
    return;
  }
  setStatus(`Loading ${sample.label}…`);
  perfClear();
  try {
    const file = await fetchDocx(sample.url, `${sample.label}.docx`);
    await instantiateSuperDoc(file, sample.label);
    if (sampleSelect) sampleSelect.value = sampleId;
    setStatus(`Loaded ${sample.label}`);
    perfReport();
    perfSummary(`Sample Document Loaded: ${sample.label}`);
  } catch (error) {
    console.error('Failed to load sample', sampleId, error);
    setStatus(`Failed to load ${sample.label}`);
  }
}

async function handleDocxSelection(file: File) {
  setStatus(`Importing ${file.name}…`);
  perfClear();
  try {
    await instantiateSuperDoc(file, file.name);
    setStatus(`Loaded ${file.name}`);
    perfSummary(`Document Loaded: ${file.name}`);
  } catch (error) {
    console.error('Failed to import DOCX', error);
    setStatus('Failed to import document.');
  }
}

async function instantiateSuperDoc(file: File, label: string) {
  superdocInstance?.destroy();
  superdocInstance = null;
  superdocMount.innerHTML = '';
  currentDocName = label;

  superdocInstance = new SuperDoc({
    selector: superdocMount,
    role: 'editor',
    documentMode: 'editing',
    modules: {
      comments: undefined,
      ai: undefined,
      toolbar: {
        selector: 'superdoc-toolbar',
        toolbarGroups: ['left', 'center', 'right'],
      },
    },
    documents: [
      {
        id: DEMO_DOC_ID,
        type: 'docx',
        name: file.name,
        data: file,
      },
    ],
    layoutEngineOptions: {
      layoutMode: currentLayoutMode,
      virtualization: DEFAULT_VIRTUALIZATION,
      debugLabel: label,
      // Override defaults to show tracked changes even in viewing mode (for demo purposes)
      trackedChanges: {
        mode: 'review',
        enabled: true,
      },
    },
    onContentError: ({ error }: ContentErrorPayload) => {
      setStatus(`Layout error: ${error?.message ?? 'unknown error'}`);
    },
    onEditorCreate: () => {
      exportBtn && (exportBtn.disabled = false);
    },
  });

  superdocInstance.on('layout-pipeline', handleLayoutPipelineEvent);
  await once(superdocInstance, 'ready');
  ensureVerticalRuler();
  updateDebugOverlay();
  setupTestApi();
}

function handleLayoutPipelineEvent(payload: LayoutPipelinePayload) {
  if (payload.type === 'layout') {
    const metrics = payload.data?.metrics;
    const pageCount = payload.data?.layout?.pages?.length ?? 0;
    if (metrics?.durationMs) {
      setStatus(`Rendered ${pageCount} pages in ${metrics.durationMs.toFixed(1)} ms`);
    } else {
      setStatus(`Rendered ${pageCount} pages.`);
    }
    verticalRuler?.refresh();
    updateDebugOverlay();
  } else if (payload.type === 'error') {
    const message = payload.data?.error?.message ?? 'Unknown error';
    setStatus(`Layout error: ${message}`);
  }
}

async function handleDocxExport() {
  if (!superdocInstance) return;
  exportBtn && (exportBtn.disabled = true);
  if (exportBtn) exportBtn.textContent = 'Exporting…';
  try {
    await superdocInstance.export({ exportedName: currentDocName || 'document', triggerDownload: true });
    if (exportBtn) exportBtn.textContent = '✅ Downloaded';
  } catch (error) {
    console.error('Export failed', error);
    if (exportBtn) exportBtn.textContent = '❌ Failed';
  } finally {
    setTimeout(() => {
      if (exportBtn) {
        exportBtn.textContent = 'Export DOCX';
        exportBtn.disabled = false;
      }
    }, 1500);
  }
}

function setLayoutMode(mode: LayoutMode) {
  currentLayoutMode = mode;
  const presentation = PresentationEditor.getInstance(DEMO_DOC_ID);
  if (presentation) {
    presentation.setLayoutMode(mode);
  }
  if (layoutModeSelect) layoutModeSelect.value = mode;
}

function ensureVerticalRuler() {
  if (!layoutHost) return;
  if (!verticalRuler) {
    verticalRuler = new VerticalRulerManager(
      layoutHost,
      () => superdocInstance?.activeEditor ?? null,
      () => deriveLayoutConfig(),
      () => PresentationEditor.getInstance(DEMO_DOC_ID)?.getLayoutSnapshot().layout ?? null,
    );
    verticalRuler.enable();
  } else {
    verticalRuler.refresh();
  }
}

function deriveLayoutConfig() {
  const presentation = PresentationEditor.getInstance(DEMO_DOC_ID);
  if (!presentation) return null;
  const options = presentation.getLayoutOptions();
  if (!options.pageSize || !options.margins) return null;
  return {
    pageSize: options.pageSize,
    margins: options.margins,
    columns: (presentation.getLayoutSnapshot().sectionMetadata?.[0]?.columns ?? undefined) as ColumnLayout | undefined,
  };
}

function updateDebugOverlay() {
  if (!isDebugMode) return;
  const snapshot = PresentationEditor.getInstance(DEMO_DOC_ID)?.getLayoutSnapshot();
  if (!snapshot || !snapshot.layout) return;
  console.table({
    pages: snapshot.layout.pages.length,
    blocks: snapshot.blocks.length,
  });
}

function setupDebugApi() {
  if (!isDebugMode) return;
  (window as any).__debugAPI = {
    getLayoutSnapshot: () => PresentationEditor.getInstance(DEMO_DOC_ID)?.getLayoutSnapshot() ?? null,
    hitTest: (x: number, y: number) => PresentationEditor.getInstance(DEMO_DOC_ID)?.hitTest(x, y) ?? null,
    setMode: (payload: any) => console.info('Debug mode toggle requested', payload),
  };
}

function setupTestApi() {
  if (!isTestMode) return;
  (window as any).__testAPI = {
    getSelection: () => {
      const editor = superdocInstance?.activeEditor;
      if (!editor) return null;
      const { from, to } = editor.state.selection;
      return { from, to };
    },
    setSelection: (from: number, to: number) => {
      const editor = superdocInstance?.activeEditor;
      if (!editor) return false;
      editor.commands?.setTextSelection({ from, to });
      return true;
    },
    getCaretCoords: () => {
      const editor = superdocInstance?.activeEditor;
      if (!editor) return null;
      const { from } = editor.state.selection;
      const presentation = PresentationEditor.getInstance(DEMO_DOC_ID);
      if (!presentation) return null;
      const bounds = presentation.getSelectionBounds(from, from);
      return bounds?.bounds ?? null;
    },
    clickToPosition: (clientX: number, clientY: number) =>
      PresentationEditor.getInstance(DEMO_DOC_ID)?.hitTest(clientX, clientY) ?? null,
    getCurrentState: () => PresentationEditor.getInstance(DEMO_DOC_ID)?.getLayoutSnapshot() ?? null,
    loadDocxBuffer: async (buffer: ArrayBuffer) => {
      const file = new File([buffer], 'test.docx', { type: DOCX_MIME });
      await instantiateSuperDoc(file, 'Test Document');
      return true;
    },
  };
}

function setStatus(message: string) {
  if (statusEl) statusEl.textContent = message;
}

function applyControlsCollapsedState() {
  if (!controlsContainer) return;
  controlsContainer.classList.toggle('is-collapsed', controlsCollapsed);
  if (toolbarToggleBtn) {
    toolbarToggleBtn.textContent = controlsCollapsed ? 'Show Toolbar ▾' : 'Hide Toolbar ▴';
    toolbarToggleBtn.setAttribute('aria-expanded', String(!controlsCollapsed));
  }
}

function getStoredFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setStoredFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // noop
  }
}

async function fetchDocx(url: string, name: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || DOCX_MIME });
}

function once(emitter: SuperDoc, event: string) {
  return new Promise<void>((resolve) => {
    const handler = () => {
      emitter.off(event, handler);
      resolve();
    };
    emitter.on(event, handler);
  });
}
