import { Extension } from '@core/Extension.js';
import { resolveSectionIdFromSummary, resolveSectionIdForPage } from './plugin/helpers/page-bands.js';
import { getSectionPreviewClone } from './plugin/helpers/section-preview.js';
import {
  createHeaderFooterEditor,
  broadcastEditorEvents,
  PaginationPluginKey as LegacyPaginationPluginKey,
} from './pagination-helpers.js';
import { syncSectionDataFromSummary } from './section-data.js';
import { createHeaderFooterRepository } from './header-footer-repository.js';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration } from 'prosemirror-view';
import { DecorationSet } from 'prosemirror-view';
import { createMeasurementEngine } from './plugin/helpers/create-measurement-engine.js';

const CSS_PX_PER_INCH = 96;
let clipPathIdCounter = 0;
const nextClipPathId = () => {
  clipPathIdCounter += 1;
  return `pagination-content-clip-${clipPathIdCounter}`;
};

const PAGINATION_INIT_SOURCE = 'pagination-extension-init';
const REPOSITORY_INIT_DELAY_MS = 16;
const REPOSITORY_INIT_MAX_ATTEMPTS = 5;
const REPOSITORY_INIT_TIMER_KEY = Symbol('paginationRepositoryInitTimer');
/**
 * Clears a previously scheduled timeout or animation frame handle when available.
 * @param {number|undefined|null} handle
 * @returns {void}
 */
const cancelScheduledHandle = (handle) => {
  if (!handle) return;
  if (typeof globalThis?.clearTimeout === 'function') {
    globalThis.clearTimeout(handle);
    return;
  }
  if (typeof globalThis?.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(handle);
  }
};

/**
 * Returns the unique clip-path id for a given pagination storage bucket.
 * @param {Record<string, any>|null|undefined} storage
 * @returns {string}
 */
const resolveClipPathId = (storage) => {
  if (storage) {
    if (!storage.clipPathId) {
      storage.clipPathId = nextClipPathId();
    }
    return storage.clipPathId;
  }
  return nextClipPathId();
};

/**
 * Pagination extension responsible for page layout chrome, spacing decorations, and header/footer management.
 * @type {import('@core/Extension.js').Extension}
 */
export const Pagination = Extension.create({
  name: 'pagination',
  priority: 500,

  /**
   * Initializes storage defaults used by the pagination extension.
   * @returns {Record<string, any>}
   */
  addStorage() {
    return {
      height: 0,
      sectionData: null,
      headerFooterEditors: new Map(),
      headerFooterDomCache: new Map(),
      breakOverlayContainer: null,
      pendingOverlayRaf: null,
      repository: null,
      repositoryConverter: null,
      pendingInitMeta: false,
      lastInitReason: null,
      pageBreaks: [],
      engine: null,
      engineHandler: null,
      headerFooterSummary: null,
      pageViewElement: null,
      pageChromeNodes: [],
      layout: {},
      showSpacingDebug: false, // Show/hide spacing decorations for debugging
      clipPathId: null,
    };
  },

  /**
   * Schedules repository initialization prior to extension creation.
   * @returns {void}
   */
  onBeforeCreate() {
    const editor = this.editor;
    const storage = this.storage;
    if (!storage) return;
    scheduleRepositoryInitialization(editor, storage, {
      reason: 'before-create',
      maxAttempts: 3,
      delayMs: 0,
    });
  },

  /**
   * Forces repository initialization once the extension finishes creating.
   * @returns {void}
   */
  onCreate() {
    const editor = this.editor;
    const storage = this.storage;
    if (!storage) return;
    scheduleRepositoryInitialization(editor, storage, {
      reason: 'create',
      force: true,
    });
  },

  /**
   * Watches transactions to keep pagination state synchronized and dispatch init metadata when required.
   * @returns {(params: { transaction: import('prosemirror-state').Transaction }) => void}
   */
  onTransaction() {
    return ({ transaction }) => {
      const editor = this.editor;
      const storage = this.storage;
      if (!storage) return;
      if (!shouldInitializePagination(editor)) return;

      const paginationMeta = transaction?.getMeta?.(PaginationPluginKey);
      if (paginationMeta?.source === PAGINATION_INIT_SOURCE) {
        return;
      }

      const legacyMeta =
        typeof transaction?.getMeta === 'function' && LegacyPaginationPluginKey
          ? transaction.getMeta(LegacyPaginationPluginKey)
          : null;
      if (legacyMeta?.source === PAGINATION_INIT_SOURCE) {
        return;
      }

      const collabReady = typeof transaction?.getMeta === 'function' ? transaction.getMeta('collaborationReady') : null;
      if (collabReady) {
        storage.pendingInitMeta = true;
        storage.lastInitReason = 'collaboration-ready';
      }

      const repositoryChanged = ensureRepositoryInitialized(editor, storage, {
        reason: collabReady ? 'collaboration-ready' : 'transaction',
      });

      synchronizeMeasurementEngine(editor, storage, { repositoryChanged });

      if (!repositoryChanged && !storage.repository) {
        scheduleRepositoryInitialization(editor, storage, {
          reason: collabReady ? 'collaboration-ready' : 'transaction',
          force: true,
        });
      }

      if (collabReady || repositoryChanged || storage.pendingInitMeta) {
        const reason =
          collabReady || storage.lastInitReason
            ? storage.lastInitReason || 'collaboration-ready'
            : repositoryChanged
              ? 'converter-changed'
              : 'transaction';
        maybeDispatchInitMeta(editor, storage, reason);
      }
    };
  },

  /**
   * Registers pagination commands.
   * @returns {Record<string, import('@core/Extension.js').Command>}
   */
  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'hardBreak',
          });
        },

      updatePagination:
        (layout) =>
        ({ editor }) => {
          const storage = editor?.storage?.pagination;
          if (storage) {
            storage.layout = layout;
          }

          ensurePageView(editor, storage, layout);

          if (editor?.view) {
            const tr = editor.state.tr.setMeta(PaginationPluginKey, { layout });
            editor.view.dispatch(tr);
          }

          return true;
        },

      applyManualPaginationLayout:
        (layout, options = {}) =>
        ({ editor }) => {
          if (!layout || !editor) {
            return false;
          }

          const storage = editor.storage?.pagination ?? null;
          if (storage) {
            storage.layout = layout;
          }

          const engine = storage?.engine ?? editor.measurement ?? null;
          if (engine && typeof engine.applyLayoutOverride === 'function') {
            engine.applyLayoutOverride(layout, options);
            return true;
          }

          if (editor.commands?.updatePagination) {
            editor.commands.updatePagination(layout);
            return true;
          }

          ensurePageView(editor, storage, layout);

          if (editor?.view) {
            const tr = editor.state.tr.setMeta(PaginationPluginKey, { layout });
            editor.view.dispatch(tr);
          }

          return true;
        },

      togglePaginationSpacingDebug:
        () =>
        ({ editor }) => {
          const storage = editor?.storage?.pagination;
          if (!storage) {
            return false;
          }

          // Toggle the flag
          storage.showSpacingDebug = !storage.showSpacingDebug;

          // Force a decorations update by dispatching a metadata-only transaction
          if (editor?.view) {
            const tr = editor.state.tr.setMeta(PaginationPluginKey, { forceDecorationsUpdate: true });
            editor.view.dispatch(tr);
          }

          return true;
        },
    };
  },

  /**
   * Adds pagination keyboard shortcuts.
   * @returns {Record<string, () => boolean>}
   */
  addShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.insertPageBreak(),
    };
  },

  /**
   * Provides the ProseMirror plugin instances used by pagination.
   * @returns {import('prosemirror-state').Plugin[]}
   */
  addPmPlugins() {
    return [createPlugin(this.editor)];
  },

  /**
   * Cleans up any scheduled timers when the extension is destroyed.
   * @returns {void}
   */
  onDestroy() {
    const storage = this.storage;
    if (!storage) return;

    // Don't destroy the measurement engine if this is a header/footer editor being destroyed
    // Header/footer editors are separate editor instances that should not affect the main editor's pagination
    const isHeaderOrFooter = this.editor?.options?.isHeaderOrFooter ?? false;

    const existingHandle = storage[REPOSITORY_INIT_TIMER_KEY];
    if (existingHandle) {
      cancelScheduledHandle(existingHandle);
      storage[REPOSITORY_INIT_TIMER_KEY] = null;
    }

    if (!isHeaderOrFooter) {
      destroyMeasurementEngine(this.editor, storage, { reason: 'extension-destroy' });
    }
  },
});

export const PaginationPluginKey = new PluginKey('pagination');

/**
 * Determines whether pagination should initialize for the current editor.
 * @param {import('@core/Editor.js').Editor} editor
 * @returns {boolean}
 */
function shouldInitializePagination(editor) {
  if (!editor) return false;
  const options = editor.options ?? {};
  if (!options.pagination) return false;
  if (options.isHeadless) return false;
  if (options.isHeaderOrFooter) return false;
  return true;
}

/**
 * Resolve an optional mount element for the measurement engine supplied via editor options.
 * @param {import('@core/Editor.js').Editor} editor
 * @returns {HTMLElement|null}
 */
function resolveMeasurementElement(editor) {
  if (!editor) return null;
  const element = editor.options?.paginationMeasurementElement ?? null;
  if (!element) return null;
  if (typeof HTMLElement === 'undefined') return null;
  return element instanceof HTMLElement ? element : null;
}

/**
 * Dispose of any measurement engine associated with the current pagination storage.
 * @param {Record<string, any>} storage
 * @returns {void}
 */
function destroyMeasurementEngine(editor, storage, { reason, emitRepositoryCleared = false } = {}) {
  const engine = storage?.engine ?? null;
  if (!engine) return;

  try {
    engine.destroy?.();
  } catch {
    // Ignore engine destruction errors
  }

  if (editor && typeof editor.emit === 'function') {
    try {
      editor.emit('pagination:engine-destroyed', { engine, reason: reason ?? 'destroy' });
      if (emitRepositoryCleared) {
        editor.emit('pagination:repository-cleared', {
          reason: reason ?? 'destroy',
        });
      }
    } catch {
      // ignore emit failures
    }
  }

  storage.engine = null;
  storage.engineHandler = null;
  if (storage) {
    storage.headerFooterSummary = null;
    storage.sectionData = null;
  }
}

/**
 * Ensure a measurement engine exists (or is refreshed) for the active editor.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {{ repositoryChanged?: boolean }} [options]
 * @returns {import('@measurement-engine').MeasurementEngine|null}
 */
function synchronizeMeasurementEngine(editor, storage, { repositoryChanged = false } = {}) {
  if (!storage) return null;

  const view = editor?.view ?? null;
  const state = view?.state ?? null;
  if (!view || !state) {
    return storage.engine ?? null;
  }

  const previousEngine = storage.engine ?? null;

  const shouldInit = shouldInitializePagination(editor);
  if (!shouldInit) {
    destroyMeasurementEngine(editor, storage, { reason: 'should-not-initialize' });
    return null;
  }

  const repository = storage.repository ?? null;
  if (!repository) {
    storage.pendingInitMeta = true;
    storage.lastInitReason = 'repository-missing';
    return previousEngine ?? null;
  }

  const overrides = {
    headerFooterRepository: repository,
  };

  const mountElement = resolveMeasurementElement(editor);
  if (mountElement) {
    overrides.element = mountElement;
  }

  const engine = createMeasurementEngine(editor, overrides);
  if (!engine) {
    return null;
  }

  if (engine !== previousEngine && editor && typeof editor.emit === 'function') {
    try {
      editor.emit('pagination:engine-ready', { engine });
      trySyncSectionData(editor, storage, engine);
    } catch {
      // ignore emit failures
    }
  }

  if ((repositoryChanged || (!previousEngine && repository)) && editor && typeof editor.emit === 'function') {
    try {
      editor.emit('pagination:repository-ready', {
        repository,
        engine,
      });
      trySyncSectionData(editor, storage, engine);
    } catch {
      // ignore emit failures
    }
  }

  if (repositoryChanged && typeof engine.refreshHeaderFooterMeasurements === 'function') {
    Promise.resolve().then(() => {
      if (storage.engine === engine) {
        try {
          const result = engine.refreshHeaderFooterMeasurements();
          if (result && typeof result.catch === 'function') {
            result.catch(() => {
              // Ignore refresh errors
            });
          }
        } catch {
          // Ignore refresh errors
        }
      }
    });
  }

  return engine;
}

const trySyncSectionData = (editor, storage, engine) => {
  if (!editor || !storage || !engine) return;
  const repository = storage.repository;
  const summary = typeof engine.getHeaderFooterSummary === 'function' ? engine.getHeaderFooterSummary() : null;
  if (!repository || !summary) {
    return;
  }
  storage.headerFooterSummary = summary;
  try {
    syncSectionDataFromSummary(editor, storage, {
      summary,
      repository,
      layoutPages: Array.isArray(storage.layoutPages) ? storage.layoutPages : [],
    });
  } catch {
    // Ignore sync errors
  }
};

/**
 * Ensures the header/footer repository exists and is bound to the active converter.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {{ force?: boolean, reason?: string }} [options={}]
 * @returns {boolean}
 */
function ensureRepositoryInitialized(editor, storage, options = {}) {
  if (!storage) return false;
  if (!shouldInitializePagination(editor)) return false;

  const converter = editor?.converter ?? null;
  if (!converter) return false;

  const force = options.force === true;
  const needsRefresh = force || !storage.repository || storage.repositoryConverter !== converter;

  if (!needsRefresh) {
    return false;
  }

  try {
    storage.repository = createHeaderFooterRepository({ converter });
    storage.repositoryConverter = converter;
    storage.pendingInitMeta = true;
    storage.lastInitReason = options.reason ?? storage.lastInitReason ?? 'refresh';
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedules repository initialization with retry logic to handle lazy converter availability.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {{ reason?: string, delayMs?: number, maxAttempts?: number, force?: boolean }} [options={}]
 * @returns {void}
 */
function scheduleRepositoryInitialization(editor, storage, options = {}) {
  if (!storage) return;
  if (!shouldInitializePagination(editor)) return;

  const {
    reason = 'init',
    delayMs = REPOSITORY_INIT_DELAY_MS,
    maxAttempts = REPOSITORY_INIT_MAX_ATTEMPTS,
    force = false,
  } = options;

  let attempts = 0;

  const cancelExisting = () => {
    const handle = storage[REPOSITORY_INIT_TIMER_KEY];
    if (!handle) return;

    cancelScheduledHandle(handle);

    storage[REPOSITORY_INIT_TIMER_KEY] = null;
  };

  const scheduleNext = (fn) => {
    if (typeof globalThis?.setTimeout === 'function') {
      return globalThis.setTimeout(fn, delayMs);
    }
    if (typeof globalThis?.requestAnimationFrame === 'function') {
      return globalThis.requestAnimationFrame(fn);
    }
    return null;
  };

  const attemptInitialization = () => {
    storage[REPOSITORY_INIT_TIMER_KEY] = null;
    const repositoryChanged = ensureRepositoryInitialized(editor, storage, { reason, force });

    synchronizeMeasurementEngine(editor, storage, { repositoryChanged });

    if (repositoryChanged || storage.pendingInitMeta) {
      maybeDispatchInitMeta(editor, storage, repositoryChanged ? reason : (storage.lastInitReason ?? reason));
      return;
    }

    attempts += 1;
    if (attempts >= maxAttempts) {
      return;
    }

    const handle = scheduleNext(attemptInitialization);
    if (handle != null) {
      storage[REPOSITORY_INIT_TIMER_KEY] = handle;
    }
  };

  cancelExisting();
  attemptInitialization();
}

/**
 * Dispatches pagination init metadata onto the current transaction.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {string} reason
 * @returns {boolean}
 */
function dispatchInitMeta(editor, reason) {
  const { state, dispatch } = editor?.view ?? {};
  if (!state || typeof dispatch !== 'function') {
    return false;
  }

  const payload = {
    isReadyToInit: true,
    source: PAGINATION_INIT_SOURCE,
    reason,
  };

  const tr = state.tr.setMeta(PaginationPluginKey, payload);
  if (LegacyPaginationPluginKey) {
    tr.setMeta(LegacyPaginationPluginKey, payload);
  }
  dispatch(tr);
  return true;
}

/**
 * Attempts to dispatch init metadata when pagination becomes ready, tracking pending state if dispatch fails.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {string} [reason]
 * @returns {boolean}
 */
function maybeDispatchInitMeta(editor, storage, reason) {
  if (!storage) return false;
  if (!shouldInitializePagination(editor)) {
    storage.pendingInitMeta = false;
    return false;
  }

  const effectiveReason = reason ?? storage.lastInitReason ?? 'refresh';
  const dispatched = dispatchInitMeta(editor, effectiveReason);

  if (dispatched) {
    storage.pendingInitMeta = false;
    storage.lastInitReason = effectiveReason;
  } else {
    storage.pendingInitMeta = true;
    storage.lastInitReason = effectiveReason;
  }

  return dispatched;
}

/**
 * Creates the pagination ProseMirror plugin.
 * @param {import('@core/Editor.js').Editor} editor
 * @returns {import('prosemirror-state').Plugin}
 */
const createPlugin = (editor) => {
  return new Plugin({
    key: PaginationPluginKey,
    state: {
      init() {
        return {
          decorations: DecorationSet.empty,
          layout: null,
        };
      },
      apply(tr, value) {
        let decorations = value.decorations ?? DecorationSet.empty;
        let layout = value.layout ?? null;

        if (decorations !== DecorationSet.empty) {
          decorations = decorations.map(tr.mapping, tr.doc);
        }

        const meta = tr.getMeta(PaginationPluginKey);
        let shouldRebuild = false;

        if (meta?.layout) {
          layout = meta.layout;
          shouldRebuild = true;
        }

        // Force decorations rebuild when debug toggle changes
        if (meta?.forceDecorationsUpdate && layout) {
          shouldRebuild = true;
        }

        if (shouldRebuild && layout) {
          decorations = buildSpacingDecorations(editor, tr.doc, layout);
        } else if (shouldRebuild) {
          decorations = DecorationSet.empty;
        }

        return {
          decorations,
          layout,
        };
      },
    },

    props: {
      decorations(state) {
        const pluginState = PaginationPluginKey.getState(state);
        return pluginState?.decorations ?? null;
      },
    },

    view() {
      return {
        destroy() {},
      };
    },
  });
};

/**
 * Generates gap decorations used to visualize reserved pagination spacing.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {import('prosemirror-model').Node} doc
 * @param {{ pages?: any[] }} [layout={}]
 * @returns {DecorationSet}
 */
const buildSpacingDecorations = (editor, doc, layout = {}) => {
  const toFinite = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };
  const pages = Array.isArray(layout?.pages) ? layout.pages : [];
  if (!pages.length) {
    return DecorationSet.empty;
  }

  const decorations = [];
  const ownerDocument = editor?.view?.dom?.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
  const domSource =
    ownerDocument ??
    (typeof document !== 'undefined' ? document : null) ??
    (typeof globalThis !== 'undefined' && globalThis.document ? globalThis.document : null);
  if (!domSource?.createElement) {
    return DecorationSet.empty;
  }

  const showDebug = editor?.storage?.pagination?.showSpacingDebug ?? false;

  const createSpacingElement = ({ heightPx, pageIndex, kind }) => {
    const element = domSource.createElement('div');
    element.className = 'pagination-spacing-highlight';
    element.style.display = 'block';
    element.style.width = '100%';
    element.style.boxSizing = 'border-box';
    element.style.pointerEvents = 'none';
    element.style.height = `${heightPx}px`;
    element.style.minHeight = `${heightPx}px`;
    element.style.margin = '0';

    // Apply debug styles only when showSpacingDebug is enabled
    if (showDebug) {
      element.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
      element.style.border = '1px solid rgba(220, 38, 38, 0.55)';
      element.style.borderRadius = '3px';
    } else {
      // Invisible by default - spacing still exists but no visual indicator
      element.style.backgroundColor = 'transparent';
      element.style.border = 'none';
    }

    element.dataset.paginationSpacing = 'true';
    element.dataset.paginationSpacingHeight = String(heightPx);
    element.dataset.paginationPageIndex = String(pageIndex);
    if (kind) {
      element.dataset.paginationSpacingKind = kind;
    }
    return element;
  };

  const firstPage = pages[0] ?? null;
  const firstHeaderReserved = toFinite(firstPage?.headerFooterAreas?.header?.reservedHeightPx);
  const firstHeaderMargin = toFinite(firstPage?.metrics?.marginTopPx);
  const leadingHeaderHeight =
    Number.isFinite(firstHeaderReserved) || Number.isFinite(firstHeaderMargin)
      ? Math.max(firstHeaderReserved ?? 0, firstHeaderMargin ?? 0, 0)
      : null;
  if (Number.isFinite(leadingHeaderHeight) && leadingHeaderHeight > 0) {
    const heightKey = Math.round(leadingHeaderHeight * 100) / 100;
    const leadingWidget = Decoration.widget(
      0,
      () =>
        createSpacingElement({
          heightPx: leadingHeaderHeight,
          pageIndex: 0,
          kind: 'leading-header',
        }),
      {
        key: `pagination-leading-header-h${heightKey}-d${showDebug ? '1' : '0'}`,
        side: -1,
      },
    );
    decorations.push(leadingWidget);
  }

  const totalPages = pages.length;
  pages.forEach((pageEntry, index) => {
    const breakInfo = pageEntry?.break ?? null;
    if (!breakInfo) {
      return;
    }

    if (!Number.isFinite(breakInfo.pos) || breakInfo.pos < 0) {
      return;
    }

    const isLastPage = index === totalPages - 1;
    if (isLastPage) {
      return;
    }

    // Use pre-calculated spacing from the engine
    const totalSpace = Number.isFinite(pageEntry?.spacingAfterPx) ? pageEntry.spacingAfterPx : 0;
    if (!(totalSpace > 0)) {
      return;
    }

    const segments = Array.isArray(pageEntry?.spacingSegments) ? pageEntry.spacingSegments : [];
    if (!segments.length) {
      return;
    }

    const createChrome = () =>
      createSpacingElement({
        heightPx: totalSpace,
        pageIndex: index,
        kind: 'page-spacing',
      });

    segments.forEach((segmentPos, segmentIndex) => {
      if (!Number.isFinite(segmentPos) || segmentPos < 0) {
        return;
      }

      // IMPORTANT: Include height and debug state in key so ProseMirror re-renders when they change
      const heightKey = Math.round(totalSpace * 100) / 100; // Round to avoid float precision issues
      const debugKey = showDebug ? '1' : '0'; // Include debug state in key to force re-render
      const widgetKey = `pagination-spacing-${index}-${segmentIndex}-${segmentPos}-h${heightKey}-d${debugKey}`;
      const widget = Decoration.widget(segmentPos, createChrome, {
        key: widgetKey,
        side: -1,
        ignoreSelection: true,
      });
      decorations.push(widget);
    });
  });

  if (!decorations.length) {
    return DecorationSet.empty;
  }

  const decorationSet = DecorationSet.create(doc, decorations);
  return decorationSet;
};

/**
 * Removes previously rendered page chrome elements.
 * @param {Record<string, any>} storage
 * @returns {void}
 */
const clearPageChrome = (storage) => {
  if (!storage || !Array.isArray(storage.pageChromeNodes)) return;
  while (storage.pageChromeNodes.length) {
    const node = storage.pageChromeNodes.pop();
    if (node?.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
};

/**
 * Builds the page chrome overlay for the current layout and tracks injected DOM nodes.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {{ pages?: any[] }} [layout={}]
 * @returns {void}
 */
const generatePageView = (editor, storage, layout = {}) => {
  const mount = editor.options.element;
  const viewContainer = editor.view.dom.parentNode;
  if (!viewContainer) {
    return;
  }
  if (storage && !Array.isArray(storage.pageChromeNodes)) {
    storage.pageChromeNodes = [];
  }

  const pages = Array.isArray(layout?.pages) ? layout.pages : [];

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index] ?? null;
    // The engine always calculates and provides pageTopOffsetPx for each page.
    // Use 0 as a defensive fallback in case of an unexpected missing value.
    const pageTop = page?.pageTopOffsetPx ?? 0;

    insertPageChrome(editor, storage, mount, viewContainer, index, pageTop, layout);
  }

  // Create SVG clip-path to hide content in gaps between pages
  const backgroundHost = viewContainer?.parentNode ?? null;
  if (backgroundHost && pages.length > 0 && editor.view.dom) {
    // Create or get the SVG clipPath element
    const svgNS = 'http://www.w3.org/2000/svg';
    let svg = backgroundHost.querySelector('.super-editor-clip-svg');
    const clipPathId = resolveClipPathId(storage);

    if (!svg) {
      svg = editor.view.dom.ownerDocument.createElementNS(svgNS, 'svg');
      svg.classList.add('super-editor-clip-svg');
      svg.style.position = 'absolute';
      svg.style.width = '0';
      svg.style.height = '0';
      backgroundHost.appendChild(svg);
    }

    // Clear existing clipPath if any
    svg.innerHTML = '';

    // Create clipPath element
    const defs = editor.view.dom.ownerDocument.createElementNS(svgNS, 'defs');
    const clipPath = editor.view.dom.ownerDocument.createElementNS(svgNS, 'clipPath');
    clipPath.setAttribute('id', clipPathId);
    clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');

    // Get the offset of the ProseMirror element to adjust coordinates
    const proseMirrorElement = editor.view.dom;
    const containerRect = proseMirrorElement.getBoundingClientRect();
    const parentRect = backgroundHost.getBoundingClientRect();
    const offsetTop = containerRect.top - parentRect.top;

    // Add a rectangle for each page
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index] ?? null;
      if (!page) continue;

      const pageTop = page.pageTopOffsetPx ?? 0;
      const pageHeight = page.metrics?.pageHeightPx ?? 1056;
      const pageWidth = page.metrics?.pageWidthPx ?? 816;

      const rect = editor.view.dom.ownerDocument.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', String(pageTop - offsetTop));
      rect.setAttribute('width', String(pageWidth));
      rect.setAttribute('height', String(pageHeight));
      clipPath.appendChild(rect);
    }

    defs.appendChild(clipPath);
    svg.appendChild(defs);

    // Apply clip-path to the ProseMirror element (actual content)
    proseMirrorElement.style.clipPath = `url(#${clipPathId})`;

    // Track the SVG element for cleanup
    if (storage?.pageChromeNodes) {
      storage.pageChromeNodes.push(svg);
    }
  }
};

/**
 * Injects page chrome elements for a specific page, including overlays and background containers.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {HTMLElement|null} [_mount]
 * @param {HTMLElement} viewContainer
 * @param {number} pageNumber
 * @param {number} pageTop
 * @param {{ pages?: any[] }} layout
 * @returns {void}
 */
const insertPageChrome = (editor, storage, _mount, viewContainer, pageNumber, pageTop, layout) => {
  // Get page dimensions from layout data, with fallback to US Letter (816px x 1056px at 96 DPI)
  const pages = Array.isArray(layout?.pages) ? layout.pages : [];
  const pageData = pages[pageNumber] ?? null;
  const pageWidthPx = pageData?.metrics?.pageWidthPx ?? 816; // 8.5 inches
  const pageHeightPx = pageData?.metrics?.pageHeightPx ?? 1056; // 11 inches

  const pageView = editor.view.dom.ownerDocument.createElement('div');
  pageView.className = 'super-editor-page-view super-editor-base-page';
  pageView.style.top = pageTop + 'px';
  pageView.style.width = pageWidthPx + 'px';
  pageView.style.height = pageHeightPx + 'px';

  const header = createSectionOverlay(editor, 'header', pageNumber, layout);
  pageView.appendChild(header);

  const footer = createSectionOverlay(editor, 'footer', pageNumber, layout);
  pageView.appendChild(footer);

  const overlayHost = viewContainer?.parentNode ?? null;
  if (!overlayHost) {
    return;
  }
  overlayHost.insertBefore(pageView, viewContainer);

  if (storage?.pageChromeNodes) {
    storage.pageChromeNodes.push(pageView);
  }

  const pageBackgroundView = editor.view.dom.ownerDocument.createElement('div');
  pageBackgroundView.className = 'super-editor-page-background-view super-editor-base-page';
  pageBackgroundView.style.top = pageTop + 'px';
  pageBackgroundView.style.width = pageWidthPx + 'px';
  pageBackgroundView.style.height = pageHeightPx + 'px';
  const backgroundHost = viewContainer?.parentNode ?? null;
  if (backgroundHost) {
    backgroundHost.insertBefore(pageBackgroundView, viewContainer);
    if (storage?.pageChromeNodes) {
      storage.pageChromeNodes.push(pageBackgroundView);
    }
  }

  // Add margin masks to hide content bleeding into header/footer areas
  const headerFooterAreas = pageData?.headerFooterAreas ?? {};
  const headerArea = headerFooterAreas?.header ?? null;
  const footerArea = headerFooterAreas?.footer ?? null;

  // Create top mask for header area
  if (headerArea?.reservedHeightPx > 0) {
    const topMask = editor.view.dom.ownerDocument.createElement('div');
    topMask.className = 'super-editor-page-margin-mask';
    topMask.style.position = 'absolute';
    topMask.style.top = pageTop + 'px';
    topMask.style.left = '-1px'; // Match page border offset
    topMask.style.width = pageWidthPx + 'px';
    topMask.style.height = headerArea.reservedHeightPx + 'px';
    topMask.style.zIndex = '3';
    topMask.style.pointerEvents = 'none';
    if (backgroundHost) {
      backgroundHost.insertBefore(topMask, viewContainer);
      if (storage?.pageChromeNodes) {
        storage.pageChromeNodes.push(topMask);
      }
    }
  }

  // Create bottom mask for footer area
  if (footerArea?.reservedHeightPx > 0) {
    const bottomMaskTop = pageTop + pageHeightPx - footerArea.reservedHeightPx;
    const bottomMask = editor.view.dom.ownerDocument.createElement('div');
    bottomMask.className = 'super-editor-page-margin-mask';
    bottomMask.style.position = 'absolute';
    bottomMask.style.top = bottomMaskTop + 'px';
    bottomMask.style.left = '-1px'; // Match page border offset
    bottomMask.style.width = pageWidthPx + 'px';
    bottomMask.style.height = footerArea.reservedHeightPx + 'px';
    bottomMask.style.zIndex = '3';
    bottomMask.style.pointerEvents = 'none';
    if (backgroundHost) {
      backgroundHost.insertBefore(bottomMask, viewContainer);
      if (storage?.pageChromeNodes) {
        storage.pageChromeNodes.push(bottomMask);
      }
    }
  }
};

/**
 * Creates the DOM overlay used to render header/footer content for a page.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {'header'|'footer'} sectionType
 * @param {number} pageIndex
 * @param {{ pages?: any[] }} [layout={}]
 * @returns {HTMLElement}
 */
const createSectionOverlay = (editor, sectionType, pageIndex, layout = {}) => {
  const doc = editor.view.dom.ownerDocument;
  const sectionDiv = doc.createElement('div');
  sectionDiv.className = 'super-editor-page-section';
  sectionDiv.dataset.paginationLabel = sectionType === 'header' ? 'Header' : 'Footer';

  const typeClass = sectionType === 'header' ? 'super-editor-page-header' : 'super-editor-page-footer';
  sectionDiv.classList.add(typeClass);

  const hitArea = doc.createElement('div');
  hitArea.className = 'super-editor-page-section-hitarea';
  hitArea.dataset.paginationSection = sectionType;
  hitArea.style.position = 'absolute';
  hitArea.style.left = '0';
  hitArea.style.right = '0';
  hitArea.style.top = '0';
  hitArea.style.bottom = '0';
  hitArea.style.pointerEvents = 'auto';
  sectionDiv.appendChild(hitArea);

  const toFinite = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const inchesToPx = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric * CSS_PX_PER_INCH : null;
  };

  const pickFirstPositive = (...values) => {
    for (const value of values) {
      const numeric = toFinite(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }
    return 0;
  };

  const storage = editor?.storage?.pagination ?? {};
  const pages = Array.isArray(layout?.pages) ? layout.pages : [];
  const currentPage =
    pages.find((p) => Number.isInteger(p?.pageIndex) && p.pageIndex === pageIndex) ?? pages[pageIndex] ?? {};
  const headerFooterAreas = currentPage?.headerFooterAreas ?? {};
  const metrics = currentPage?.metrics ?? {};
  const section = headerFooterAreas?.[sectionType] ?? null;

  const summary = storage?.headerFooterSummary ?? null;
  const isLastPage = sectionType === 'footer' && pageIndex === pages.length - 1;

  const extractSectionId = (section) => {
    const candidates = [section?.sectionId, section?.id, section?.areaId];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  };

  const layoutSectionId = extractSectionId(section);

  let sectionId = layoutSectionId ?? resolveSectionIdFromSummary(summary, sectionType, pageIndex, isLastPage);

  if (!sectionId) {
    const converterKey = sectionType === 'header' ? 'headerIds' : 'footerIds';
    sectionId = resolveSectionIdForPage(editor, pageIndex + 1, converterKey);
  }

  const bucketKey = sectionType === 'header' ? 'headers' : 'footers';
  const sectionEntry =
    sectionId && storage?.sectionData && storage.sectionData[bucketKey]
      ? (storage.sectionData[bucketKey][sectionId] ?? null)
      : null;

  const marginKey = sectionType === 'header' ? 'marginTopPx' : 'marginBottomPx';
  const marginValue = toFinite(metrics?.[marginKey]);
  const reservedHeight =
    toFinite(section?.reservedHeightPx) ??
    toFinite(sectionEntry?.reservedHeight) ??
    toFinite(section?.metrics?.effectiveHeightPx) ??
    marginValue ??
    0;

  if (reservedHeight > 0) {
    sectionDiv.style.height = `${Math.round(reservedHeight)}px`;
  }

  const pageNumber = pageIndex + 1;
  const slot = doc.createElement('div');
  slot.className = 'super-editor-page-section-slot';
  slot.style.position = 'absolute';
  slot.style.display = 'flex';
  slot.style.flexDirection = 'column';
  slot.style.overflow = 'visible';
  slot.style.pointerEvents = 'none';

  hitArea.addEventListener('dblclick', (event) => {
    event.preventDefault();
    event.stopPropagation();
    activateHeaderFooterEditor({
      editor,
      storage,
      sectionType,
      sectionId,
      pageNumber,
      pageIndex,
      slot,
      hitArea,
      resolvedHeight: reservedHeight,
    });
  });

  const pageMargins = editor?.converter?.pageStyles?.pageMargins ?? {};
  const fallbackMarginLeftPx = inchesToPx(pageMargins?.left);
  const fallbackMarginRightPx = inchesToPx(pageMargins?.right);

  const slotLeftPx = Math.max(
    pickFirstPositive(sectionEntry?.slotLeftPx, section?.slotLeftPx, metrics?.marginLeftPx, fallbackMarginLeftPx),
    0,
  );
  const slotRightPx = Math.max(
    pickFirstPositive(sectionEntry?.slotRightPx, section?.slotRightPx, metrics?.marginRightPx, fallbackMarginRightPx),
    0,
  );
  slot.style.left = `${Math.round(slotLeftPx)}px`;
  slot.style.right = `${Math.round(slotRightPx)}px`;

  // Use page margins as fallback for header/footer distance (pageMargins already declared above)
  const fallbackHeaderDistancePx = inchesToPx(pageMargins?.header) ?? 0;
  const fallbackFooterDistancePx = inchesToPx(pageMargins?.footer) ?? 0;
  const fallbackOffsetPx = sectionType === 'footer' ? fallbackFooterDistancePx : fallbackHeaderDistancePx;

  const offsetHeight =
    toFinite(section?.metrics?.offsetPx) ??
    toFinite(section?.metrics?.distancePx) ??
    toFinite(sectionEntry?.offsetHeight) ??
    fallbackOffsetPx;

  // Get slot height, but skip sectionEntry?.slotHeightPx if it's 0 (invalid)
  // A height of 0 would cause incorrect padding-based layout
  let slotHeight =
    (toFinite(sectionEntry?.slotHeightPx) > 0 ? toFinite(sectionEntry?.slotHeightPx) : null) ??
    toFinite(section?.slotHeightPx) ??
    toFinite(section?.metrics?.contentHeightPx);

  if (!Number.isFinite(slotHeight) && Number.isFinite(reservedHeight)) {
    slotHeight = Math.max(reservedHeight - Math.max(offsetHeight, 0), 0);
  }

  if (!Number.isFinite(slotHeight)) {
    slotHeight = 0;
  }

  let slotTopPx = toFinite(sectionEntry?.slotTopPx) ?? toFinite(section?.slotTopPx);

  // If slotTopPx is not set or is 0, use the calculated offsetHeight as fallback
  // This ensures headers/footers respect page margins even when section data is incomplete
  if (!Number.isFinite(slotTopPx) || (slotTopPx === 0 && offsetHeight > 0)) {
    if (sectionType === 'footer' && Number.isFinite(reservedHeight)) {
      slotTopPx = Math.max(reservedHeight - Math.max(offsetHeight, 0) - Math.max(slotHeight, 0), 0);
    } else {
      slotTopPx = Math.max(offsetHeight, 0);
    }
  }

  // Get max slot height, but skip sectionEntry?.slotMaxHeightPx if it's 0 (invalid)
  const slotMaxHeightPx =
    (toFinite(sectionEntry?.slotMaxHeightPx) > 0 ? toFinite(sectionEntry?.slotMaxHeightPx) : null) ??
    toFinite(section?.slotMaxHeightPx) ??
    (Number.isFinite(reservedHeight) ? Math.max(reservedHeight - Math.max(offsetHeight, 0), 0) : null);

  if (Number.isFinite(reservedHeight)) {
    slotHeight = Math.max(0, Math.min(slotHeight, reservedHeight));
  }

  if (Number.isFinite(slotMaxHeightPx)) {
    slotHeight = Math.max(0, Math.min(slotHeight, slotMaxHeightPx));
  }

  slot.style.bottom = 'auto';
  slot.style.justifyContent = sectionType === 'footer' ? 'flex-end' : 'flex-start';

  if (slotHeight > 0) {
    const roundedHeight = Math.round(slotHeight);
    slot.style.top = `${Math.round(Math.max(slotTopPx, 0))}px`;
    slot.style.height = `${roundedHeight}px`;
    const roundedMaxHeight = Number.isFinite(slotMaxHeightPx)
      ? Math.round(Math.max(0, slotMaxHeightPx))
      : roundedHeight;
    slot.style.maxHeight = `${roundedMaxHeight}px`;
  } else if (Number.isFinite(reservedHeight) && reservedHeight > 0) {
    // Padding-based layout: use offsetHeight for the margin, not slotTopPx
    const appliedOffset = Math.max(offsetHeight, 0);
    const roundedReserved = Math.round(reservedHeight);
    slot.style.top = '0px';
    slot.style.height = `${roundedReserved}px`;
    slot.style.maxHeight = `${roundedReserved}px`;
    if (appliedOffset > 0) {
      const roundedOffset = Math.round(appliedOffset);
      if (sectionType === 'footer') {
        slot.style.justifyContent = 'flex-end';
        slot.style.paddingBottom = `${roundedOffset}px`;
      } else {
        slot.style.justifyContent = 'flex-start';
        slot.style.paddingTop = `${roundedOffset}px`;
      }
    } else {
      slot.style.removeProperty('padding-top');
      slot.style.removeProperty('padding-bottom');
    }
    // Set dataset for padding-based layout
    slot.dataset.paginationOffset = String(Math.round(appliedOffset));
  } else {
    // Height-based layout: use slotTopPx for positioning
    slot.style.top = `${Math.round(Math.max(slotTopPx, 0))}px`;
    slot.style.height = 'auto';
    slot.style.removeProperty('max-height');
    slot.style.removeProperty('padding-top');
    slot.style.removeProperty('padding-bottom');
    // Set dataset for height-based layout
    slot.dataset.paginationOffset = String(Math.round(Math.max(slotTopPx, 0)));
  }

  slot.dataset.paginationSection = sectionType;
  slot.dataset.paginationSectionRole = 'overlay-slot';
  slot.dataset.paginationPage = String(pageNumber);
  if (sectionId) {
    slot.dataset.paginationSectionId = sectionId;
  }
  hitArea.dataset.paginationSection = sectionType;
  hitArea.dataset.paginationSectionRole = 'hitarea';
  hitArea.dataset.paginationPage = String(pageNumber);
  if (sectionId) {
    hitArea.dataset.paginationSectionId = sectionId;
  }

  const content = sectionId != null ? getSectionPreviewClone(editor, sectionType, sectionId, { pageNumber }) : null;
  const contentNode = content ?? editor.view.dom.ownerDocument.createElement('div');

  contentNode.dataset.paginationSection = sectionType;
  contentNode.dataset.paginationSectionRole = 'overlay-content';
  contentNode.dataset.paginationPage = String(pageNumber);
  if (sectionId) {
    contentNode.dataset.paginationSectionId = sectionId;
  }
  // Copy the offset value from the slot dataset
  contentNode.dataset.paginationOffset = slot.dataset.paginationOffset;

  // CRITICAL: Adjust content position when using padding-based layout
  // The content element has position:absolute with top:0, which ignores the slot's padding.
  // We need to adjust the top position to match the padding value.
  const paddingTop = slot.style.paddingTop;
  const paddingBottom = slot.style.paddingBottom;
  if (paddingTop && paddingTop !== '' && paddingTop !== '0px') {
    // Header with padding - adjust content top position
    contentNode.style.top = paddingTop;
  } else if (paddingBottom && paddingBottom !== '' && paddingBottom !== '0px') {
    // Footer with padding - keep top at 0 since it uses flexbox justifyContent: flex-end
    // The padding-bottom will push it up naturally
  }

  slot.appendChild(contentNode);
  hitArea.appendChild(slot);

  return sectionDiv;
};

/**
 * Synchronizes the page view chrome with the latest pagination layout.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {{ pages?: any[] }} breaks
 * @returns {void}
 */
const ensurePageView = (editor, storage, breaks) => {
  clearPageChrome(storage);
  generatePageView(editor, storage, breaks);
};

/**
 * Mounts a section editor into the overlay slot for header/footer editing.
 * @param {{ editor: import('@core/Editor.js').Editor, storage: Record<string, any>, sectionType: 'header'|'footer', sectionId: string|null, pageNumber: number, pageIndex: number, slot: HTMLElement, hitArea: HTMLElement, resolvedHeight: number|null }} params
 * @returns {void}
 */
function activateHeaderFooterEditor({
  editor,
  storage,
  sectionType,
  sectionId,
  pageNumber,
  pageIndex,
  slot,
  hitArea,
  resolvedHeight,
}) {
  if (!editor || !storage || !slot || !sectionType) {
    return;
  }

  if (!slot.isConnected) {
    return;
  }

  if (!sectionId) {
    return;
  }

  const map = ensureHeaderFooterEditorsMap(storage);
  const editorKey = computeSectionEditorKey({ sectionType, sectionId, pageNumber });
  const existingEntry = map.get(editorKey);
  if (existingEntry && !existingEntry.deactivating) {
    existingEntry.editor?.view?.focus?.();
    return;
  }

  if (storage.activeHeaderFooterEditorKey && storage.activeHeaderFooterEditorKey !== editorKey) {
    deactivateHeaderFooterEditor(editor, storage, storage.activeHeaderFooterEditorKey, { reason: 'switch' });
  }

  const doc = editor?.view?.dom?.ownerDocument ?? slot.ownerDocument;
  if (!doc) {
    return;
  }

  const hadActiveEditors = hasActiveHeaderFooterEditor(map);
  const { data, reservedHeight } = getSectionDataForEditing(editor, storage, sectionType, sectionId, {
    fallbackHeight: resolvedHeight,
  });

  const editorContainer = doc.createElement('div');
  editorContainer.className = 'super-editor-page-section-editor';
  editorContainer.style.position = 'relative';
  editorContainer.style.display = 'flex';
  editorContainer.style.flexDirection = 'column';
  editorContainer.style.width = '100%';
  editorContainer.style.height = '100%';
  editorContainer.style.maxHeight = '100%';
  editorContainer.style.pointerEvents = 'auto';
  editorContainer.style.background = 'transparent';
  editorContainer.dataset.paginationSection = sectionType;
  editorContainer.dataset.paginationSectionRole = 'editor';
  editorContainer.dataset.paginationPage = String(pageNumber);
  editorContainer.dataset.paginationEditorKey = editorKey;
  if (sectionId) {
    editorContainer.dataset.paginationSectionId = sectionId;
  }

  const previewNodes = hideSlotPreview(slot);
  slot.style.pointerEvents = 'auto';
  slot.dataset.paginationEditing = sectionType;
  const sectionContainer = slot.closest('.super-editor-page-section');
  sectionContainer?.classList.add('editing');
  hitArea?.setAttribute?.('aria-pressed', 'true');
  slot.appendChild(editorContainer);

  const availableHeight = getSlotAvailableHeight(slot, reservedHeight ?? resolvedHeight);

  let sectionEditor = null;
  try {
    sectionEditor = createHeaderFooterEditor({
      editor,
      data,
      editorContainer,
      appendToBody: false,
      sectionId,
      type: sectionType,
      availableHeight,
      currentPageNumber: pageNumber,
      isEditable: true,
      onBlurHook: () => {
        deactivateHeaderFooterEditor(editor, storage, editorKey, { reason: 'blur' });
      },
    });
  } catch (error) {
    console.warn('[pagination] failed to initialize header/footer editor', error);
    restoreSlotPreview(previewNodes);
    if (slot.contains(editorContainer)) {
      slot.removeChild(editorContainer);
    }
    slot.style.pointerEvents = 'none';
    delete slot.dataset.paginationEditing;
    hitArea?.removeAttribute?.('aria-pressed');
    return;
  }

  broadcastEditorEvents(editor, sectionEditor);

  const entry = {
    key: editorKey,
    type: sectionType,
    sectionId,
    pageNumber,
    pageIndex,
    editor: sectionEditor,
    container: editorContainer,
    slot,
    hitArea,
    previewNodes,
    deactivating: false,
  };
  map.set(editorKey, entry);
  storage.activeHeaderFooterEditorKey = editorKey;

  if (!hadActiveEditors) {
    setMainEditorHeaderFooterUi(editor, storage, true);
  }

  requestAnimationFrame(() => {
    try {
      const view = sectionEditor?.view;
      view?.focus?.();
      if (view) {
        const endSelection = TextSelection.atEnd(view.state.doc);
        if (!endSelection.eq(view.state.selection)) {
          view.dispatch(view.state.tr.setSelection(endSelection));
        }
      }
      const pm = view?.dom;
      if (pm) {
        pm.setAttribute('aria-readonly', 'false');
      }
    } catch {
      // Ignore focus errors
    }
  });
}

/**
 * Deactivates a section editor, restoring UI chrome and cleaning up state.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {string} key
 * @param {{ reason?: string }} [options={}]
 * @returns {boolean}
 */
function deactivateHeaderFooterEditor(editor, storage, key, options = {}) {
  if (!editor || !storage || !key) return false;
  const map = ensureHeaderFooterEditorsMap(storage, false);
  if (!map) return false;
  const entry = map.get(key);
  if (!entry) return false;
  if (entry.deactivating) return false;

  entry.deactivating = true;
  map.delete(key);
  if (storage.activeHeaderFooterEditorKey === key) {
    storage.activeHeaderFooterEditorKey = null;
  }

  try {
    entry.hitArea?.removeAttribute?.('aria-pressed');
  } catch {}

  restoreSlotPreview(entry.previewNodes);
  if (entry.slot) {
    entry.slot.style.pointerEvents = 'none';
    delete entry.slot.dataset.paginationEditing;
  }
  const sectionContainer = entry.slot?.closest?.('.super-editor-page-section');
  sectionContainer?.classList.remove('editing');
  if (entry.container?.parentNode) {
    entry.container.parentNode.removeChild(entry.container);
  }

  try {
    entry.editor?.destroy?.();
  } catch {
    // Ignore editor teardown errors
  }

  const hasRemaining = hasActiveHeaderFooterEditor(map);
  if (!hasRemaining) {
    setMainEditorHeaderFooterUi(editor, storage, false);
    const container = entry.slot?.closest?.('.super-editor-page-section');
    container?.classList.remove('editing');

    // Trigger pagination recalculation to refresh page chrome after exiting header/footer edit mode
    const engine = storage?.engine ?? editor?.measurement ?? null;
    if (engine && typeof engine.calculatePageBreaks === 'function') {
      requestAnimationFrame(() => {
        try {
          engine.calculatePageBreaks();
        } catch {
          // Ignore recalculation errors
        }
      });
    }
  }

  if (options?.reason === 'switch' && hasRemaining) {
    // Ensure the new active editor is focused after switching.
    const activeKey = storage.activeHeaderFooterEditorKey;
    if (activeKey) {
      const activeEntry = map.get(activeKey);
      activeEntry?.editor?.view?.focus?.();
    }
  }

  return true;
}

/**
 * Retrieves the header/footer editors map from storage, optionally creating it.
 * @param {Record<string, any>} storage
 * @param {boolean} [createIfMissing=true]
 * @returns {Map<string, any>|null}
 */
function ensureHeaderFooterEditorsMap(storage, createIfMissing = true) {
  if (!storage) return null;
  if (storage.headerFooterEditors instanceof Map) {
    return storage.headerFooterEditors;
  }

  if (!createIfMissing) return null;
  const map = new Map();
  storage.headerFooterEditors = map;
  return map;
}

/**
 * Derives a unique identifier for a section editor keyed by type, id, and page.
 * @param {{ sectionType?: string, sectionId?: string, pageNumber?: number }} params
 * @returns {string}
 */
function computeSectionEditorKey({ sectionType, sectionId, pageNumber }) {
  const type = sectionType ?? 'section';
  const id = sectionId ?? 'unknown';
  const page = Number.isFinite(pageNumber) ? String(pageNumber) : 'all';
  return `${type}:${id}:${page}`;
}

/**
 * Checks whether any active section editors remain attached to the overlay.
 * @param {Map<string, any>} map
 * @returns {boolean}
 */
function hasActiveHeaderFooterEditor(map) {
  if (!(map instanceof Map)) return false;
  for (const entry of map.values()) {
    if (entry && !entry.deactivating) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves source content and reserved height when preparing a section editor.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {'header'|'footer'} sectionType
 * @param {string} sectionId
 * @param {{ fallbackHeight?: number|null }} [options={}]
 * @returns {{ data: Record<string, any>|null, reservedHeight: number|null }}
 */
function getSectionDataForEditing(editor, storage, sectionType, sectionId, options = {}) {
  const fallbackHeight = Number.isFinite(options?.fallbackHeight) ? options.fallbackHeight : null;
  if (!storage || !sectionId) {
    return { data: null, reservedHeight: fallbackHeight };
  }

  const bucketKey = sectionType === 'footer' ? 'footers' : 'headers';
  const sectionEntry = storage.sectionData?.[bucketKey]?.[sectionId] ?? null;

  let data = sectionEntry?.data ?? null;
  let reservedHeight = Number.isFinite(sectionEntry?.reservedHeight) ? sectionEntry.reservedHeight : null;

  if (!data) {
    const repoRecord = storage.repository?.get?.(sectionId) ?? null;
    data = repoRecord?.contentJson ?? null;
  }

  if (!Number.isFinite(reservedHeight)) {
    const summary = storage.headerFooterSummary ?? null;
    if (summary && summary.sectionMetricsById instanceof Map) {
      const metrics = summary.sectionMetricsById.get(sectionId);
      if (metrics && Number.isFinite(metrics.effectiveHeightPx)) {
        reservedHeight = metrics.effectiveHeightPx;
      }
    }
  }

  if (!Number.isFinite(reservedHeight)) {
    reservedHeight = fallbackHeight;
  }

  return { data, reservedHeight };
}

/**
 * Removes non-editor nodes from the overlay slot to make room for an editor.
 * @param {Node} slot
 * @returns {Array<{ node: Node, parent: Node|null, nextSibling: Node|null }>}
 */
function hideSlotPreview(slot) {
  if (!(slot instanceof Node)) return [];
  const previews = [];
  const children = Array.from(slot.childNodes ?? []);
  children.forEach((node) => {
    if (!(node instanceof Node)) return;
    if (node instanceof HTMLElement && node.dataset?.paginationSectionRole === 'editor') return;
    previews.push({
      node,
      parent: node.parentNode,
      nextSibling: node.nextSibling,
    });
    try {
      slot.removeChild(node);
    } catch {}
  });
  return previews;
}

/**
 * Reattaches preview nodes that were previously removed from the slot.
 * @param {Array<{ node: Node, parent: Node|null, nextSibling: Node|null }>} previewNodes
 * @returns {void}
 */
function restoreSlotPreview(previewNodes) {
  if (!Array.isArray(previewNodes)) return;
  previewNodes.forEach(({ node, parent, nextSibling }) => {
    if (!node) return;
    const targetParent = parent ?? nextSibling?.parentNode ?? null;
    if (!targetParent) return;
    try {
      if (nextSibling && nextSibling.parentNode === targetParent) {
        targetParent.insertBefore(node, nextSibling);
      } else {
        targetParent.appendChild(node);
      }
    } catch {}
  });
}

/**
 * Determines the usable height inside the overlay slot.
 * @param {HTMLElement|null} slot
 * @param {number|null} reservedHeight
 * @returns {number|null}
 */
function getSlotAvailableHeight(slot, reservedHeight) {
  if (!slot) return Number.isFinite(reservedHeight) ? reservedHeight : null;
  const rect = typeof slot.getBoundingClientRect === 'function' ? slot.getBoundingClientRect() : null;
  if (rect && Number.isFinite(rect.height) && rect.height > 0) {
    return rect.height;
  }
  const offsetHeight = slot instanceof HTMLElement ? slot.offsetHeight : null;
  if (Number.isFinite(offsetHeight) && offsetHeight > 0) {
    return offsetHeight;
  }
  return Number.isFinite(reservedHeight) ? reservedHeight : null;
}

/**
 * Toggles global editor UI affordances while a header/footer editor is active.
 * @param {import('@core/Editor.js').Editor} editor
 * @param {Record<string, any>} storage
 * @param {boolean} enabled
 * @returns {void}
 */
function setMainEditorHeaderFooterUi(editor, storage, enabled) {
  if (!editor || !storage) return;
  const pm = editor?.view?.dom;
  if (!(pm instanceof HTMLElement)) return;

  const stateKey = '__headerFooterUiState';
  const state = storage[stateKey] || { active: false, wasEditable: false, previousAriaReadonly: null };

  if (enabled) {
    if (state.active) return;
    state.active = true;
    state.wasEditable = editor.isEditable;
    state.previousAriaReadonly = pm.getAttribute('aria-readonly');
    storage[stateKey] = state;

    if (state.wasEditable) {
      editor.setEditable(false, false);
    }
    pm.classList.add('header-footer-edit');
    pm.setAttribute('aria-readonly', 'true');
    return;
  }

  if (!state.active) {
    return;
  }
  state.active = false;
  storage[stateKey] = state;

  if (state.wasEditable) {
    editor.setEditable(true, false);
  }

  if (state.previousAriaReadonly != null) {
    pm.setAttribute('aria-readonly', state.previousAriaReadonly);
  } else {
    pm.removeAttribute('aria-readonly');
  }
  pm.classList.remove('header-footer-edit');
}
