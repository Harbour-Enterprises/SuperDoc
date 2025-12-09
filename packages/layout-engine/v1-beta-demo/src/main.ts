import './style.css';
import './app-header.css';
import '@superdoc/common/styles/common-styles.css';
import '@editor/style.css';

import { SuperDoc } from 'superdoc';
import { PresentationEditor } from '@editor';
import type { LayoutEngineOptions } from '@editor';
import imageDocUrl from './assets/image-inline-and-block.docx?url';
import paragraphDocUrl from './assets/basic-paragraph.docx?url';
import twoColumnDocUrl from './assets/two_column_two_page.docx?url';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DEMO_DOC_ID = 'v1-beta-demo-doc';
const DEFAULT_VIRTUALIZATION = { enabled: true, window: 5, overscan: 1, gap: 24 } as const;
type LayoutMode = 'vertical' | 'horizontal' | 'book';

const SAMPLE_DOCS = [
  { id: 'two-column', label: 'Two Column Layout', url: twoColumnDocUrl },
  { id: 'image', label: 'Images + Captions', url: imageDocUrl },
  { id: 'paragraph', label: 'Basic Paragraph', url: paragraphDocUrl },
] as const;

let superdocInstance: SuperDoc | null = null;
let currentLayoutMode: LayoutMode = 'vertical';
let currentDocName = '';
let statusEl: HTMLElement | null = null;
let exportBtn: HTMLButtonElement | null = null;
let fileInput: HTMLInputElement | null = null;
let layoutModeSelect: HTMLSelectElement | null = null;
let sampleSelect: HTMLSelectElement | null = null;
let layoutHost: HTMLElement;
let superdocMount: HTMLElement;
let presentationInstance: ReturnType<typeof PresentationEditor.getInstance> | null = null;

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

  await loadInitialDocument();
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
    <p>Preview the virtualized layout engine inside SuperDoc.</p>
    <ul>
      <li>True paginated rendering</li>
      <li>Multi-column layouts</li>
      <li>Fast scroll/zoom</li>
    </ul>
  `;

  meta.append(chip, title, sub);

  const betaNotice = document.createElement('div');
  betaNotice.className = 'header-beta-notice';
  betaNotice.innerHTML =
    '<strong>Beta:</strong> This demo uses the main editor components. Features may change as layout work lands.';

  wrapper.append(logo, meta, betaNotice);
  return wrapper;
}

function createControls(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'controls';
  container.id = 'controls';

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

  sampleSelect = document.createElement('select');
  sampleSelect.id = 'sample-file-select';
  sampleSelect.className = 'layout-mode-select';
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

  leftGroup.append(layoutModeSelect, sampleSelect);
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
  const candidates = ['two-column', 'image', 'paragraph'];
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
  try {
    const file = await fetchDocx(sample.url, `${sample.label}.docx`);
    await instantiateSuperDoc(file, sample.label);
    if (sampleSelect) sampleSelect.value = sampleId;
    setStatus(`Loaded ${sample.label}`);
  } catch (error) {
    console.error('Failed to load sample', sampleId, error);
    setStatus(`Failed to load ${sample.label}`);
  }
}

async function handleDocxSelection(file: File) {
  setStatus(`Importing ${file.name}…`);
  try {
    await instantiateSuperDoc(file, file.name);
    setStatus(`Loaded ${file.name}`);
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
      trackedChanges: {
        mode: 'review',
        enabled: true,
      },
    } as LayoutEngineOptions,
    onContentError: ({ error }) => {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : 'unknown error';
      setStatus(`Layout error: ${errorMessage}`);
    },
    onEditorCreate: () => {
      exportBtn && (exportBtn.disabled = false);
    },
  });

  superdocInstance.on('layout-pipeline', handleLayoutPipelineEvent);
  await once(superdocInstance, 'ready');

  // Get PresentationEditor instance - try static method first, fallback to document store
  presentationInstance = PresentationEditor.getInstance(DEMO_DOC_ID) ?? null;
  if (!presentationInstance && superdocInstance?.superdocStore?.documents) {
    const doc = superdocInstance.superdocStore.documents.find((d: any) => d.id === DEMO_DOC_ID);
    if (doc && typeof doc.getPresentationEditor === 'function') {
      presentationInstance = doc.getPresentationEditor();
    }
  }

  setupTestApi();
}

function handleLayoutPipelineEvent(payload: {
  type: 'layout' | 'error';
  data?: {
    metrics?: { durationMs?: number };
    layout?: { pages?: Array<unknown> };
    error?: Error | { message?: string };
  };
}) {
  presentationInstance ??= PresentationEditor.getInstance(DEMO_DOC_ID) ?? null;
  if (payload.type === 'layout') {
    const metrics = payload.data?.metrics;
    const pageCount = payload.data?.layout?.pages?.length ?? 0;
    if (metrics?.durationMs) {
      setStatus(`Rendered ${pageCount} pages in ${metrics.durationMs.toFixed(1)} ms`);
    } else {
      setStatus(`Rendered ${pageCount} pages.`);
    }
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

  // Try to get instance if we don't have it yet
  if (!presentationInstance) {
    presentationInstance = PresentationEditor.getInstance(DEMO_DOC_ID) ?? null;

    // Fallback: try getting from document store
    if (!presentationInstance && superdocInstance?.superdocStore?.documents) {
      const doc = superdocInstance.superdocStore.documents.find((d: any) => d.id === DEMO_DOC_ID);
      if (doc && typeof doc.getPresentationEditor === 'function') {
        presentationInstance = doc.getPresentationEditor();
      }
    }
  }

  // Apply the layout mode change
  if (presentationInstance && typeof presentationInstance.setLayoutMode === 'function') {
    presentationInstance.setLayoutMode(mode);
  }

  if (layoutModeSelect) layoutModeSelect.value = mode;
}

function setupTestApi() {
  if (import.meta.env?.MODE !== 'test') return;
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
    getCurrentState: () =>
      (presentationInstance ?? PresentationEditor.getInstance(DEMO_DOC_ID))?.getLayoutSnapshot() ?? null,
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
