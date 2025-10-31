import { EditorState } from 'prosemirror-state';
import { createMeasurementEditor, normalizeInchesToPx } from './helpers/index.js';
import { generatePageBreaks } from '../page-breaks/index.js';
import { measureHeaderFooterSections, resolveHeaderFooterForPage } from './headers-footers/index.js';
import {
  PIXELS_PER_INCH,
  CONTENT_HEIGHT_ALLOWANCE_INCHES,
  CONTENT_HEIGHT_ALLOWANCE_IN_PX,
  DEFAULT_PAGE_HEIGHT_IN_PX,
  DEFAULT_PAGE_MARGINS_IN_PX,
  BREAK_TOLERANCE_PX,
  DEFAULT_PAGE_BREAK_GAP_PX,
  BINARY_BACKTRACK_STEPS,
} from './constants.js';

/**
 * @typedef {Object} MeasurementEngineConfig
 * @property {import('@/index.js').Editor|null} editor Host editor instance that owns pagination.
 * @property {HTMLElement|null} [element] Optional DOM element to mount the hidden measurement editor into.
 * @property {(layout: object) => void} [onPageBreaksUpdate] Callback invoked after pagination is recalculated.
 * @property {object|null} [headerFooterRepository] Shared header/footer repository used to compute section metrics.
 */

/**
 * Coordinates a read-only measurement editor that mirrors the host editor so pagination metrics can be produced without
 * mutating the primary document.
 */
export class MeasurementEngine {
  static get PIXELS_PER_INCH() {
    return PIXELS_PER_INCH;
  }
  static get CONTENT_HEIGHT_ALLOWANCE_INCHES() {
    return CONTENT_HEIGHT_ALLOWANCE_INCHES;
  }
  static get CONTENT_HEIGHT_ALLOWANCE_IN_PX() {
    return CONTENT_HEIGHT_ALLOWANCE_IN_PX;
  }
  static get DEFAULT_PAGE_HEIGHT_IN_PX() {
    return DEFAULT_PAGE_HEIGHT_IN_PX;
  }
  static get DEFAULT_PAGE_MARGINS_IN_PX() {
    return DEFAULT_PAGE_MARGINS_IN_PX;
  }
  static get BREAK_TOLERANCE_PX() {
    return BREAK_TOLERANCE_PX;
  }
  static get BINARY_BACKTRACK_STEPS() {
    return BINARY_BACKTRACK_STEPS;
  }
  static get PAGE_BREAK_SPACING_PX() {
    return DEFAULT_PAGE_BREAK_GAP_PX;
  }

  #ready = false;
  #resolveReady = null;
  #hasExternalElement = false;
  #destroyed = false;
  #onMeasurementEditorCreate = () => {
    this.#syncMeasurementEditorState();
    this.calculatePageBreaks();
    this.#markReady();
  };

  config = {
    editor: null,
    element: null,
    onPageBreaksUpdate: () => null,
    headerFooterRepository: null,
  };

  measurementElement = null;
  layoutPackage = null;
  baselineLayoutPackage = null; // Stores the original calculated layout before any manual overrides
  pageBreaks = [];
  fieldSegments = [];

  readyPromise = Promise.resolve(true);

  /**
   * @param {MeasurementEngineConfig} config Runtime configuration for the measurement engine.
   */
  constructor(config) {
    const { editor, element = null, onPageBreaksUpdate = () => null, headerFooterRepository = null } = config;

    this.config = { editor, element, onPageBreaksUpdate, headerFooterRepository };
    this.editor = editor;
    this.headerFooterRepository = headerFooterRepository;

    if (this.editor) {
      this.editor.measurement = this;
    }

    this.readyPromise = new Promise((resolve) => {
      this.#resolveReady = resolve;
    });

    this.headerFooterSummary = {
      sectionMetricsById: new Map(),
      variantLookup: {
        header: new Map(),
        footer: new Map(),
      },
      contentWidthPx: null,
      distancesPx: {
        header: 0,
        footer: 0,
      },
    };

    this.headerFooterPromise = Promise.resolve();

    if (this.editor?.options?.isHeaderOrFooter) {
      this.#ready = true;
      this.#resolveReady?.(true);
      return;
    }

    // Early return if no editor is provided
    if (!this.editor) {
      this.#ready = true;
      this.#resolveReady?.(true);
      return;
    }

    this.editor.on('transaction', this.#onTransaction);
    this.#hasExternalElement = Boolean(element);

    this.element = element;
    this.measurementEditor = createMeasurementEditor(this.editor, this.element);
    this.measurementEditor?.on?.('create', this.#onMeasurementEditorCreate);
    this.measurementElement = this.#getMeasurementElement();

    this.#syncMeasurementEditorState();
    this.#initHeaderFooterMeasurements();
    this.#initDocumentSizes();
    this.calculatePageBreaks();
  }

  /**
   * Extract measurement element reference from the editor.
   * @returns {HTMLElement|null}
   */
  #getMeasurementElement() {
    return this.measurementEditor?.element || this.measurementEditor?.options?.element || null;
  }

  /**
   * Internal ProseMirror transaction listener that mirrors document changes before triggering pagination.
   * @param {{ transaction: import('prosemirror-state').Transaction }} param0
   * @returns {void}
   */
  #onTransaction = ({ transaction } = {}) => {
    if (!transaction || !transaction.docChanged) return;

    const synced = this.#syncMeasurementEditorState();
    if (!synced) return;

    this.calculatePageBreaks();
  };

  /**
   * Synchronize the measurement editor's state with the host editor document.
   * @returns {boolean} True when the measurement editor state was updated.
   */
  #syncMeasurementEditorState() {
    const sourceState = this.editor?.state;
    const measurementEditor = this.measurementEditor;
    const measurementView = measurementEditor?.view;
    const measurementState = measurementEditor?.state;

    if (!sourceState || !measurementView || !measurementState) {
      return false;
    }

    const sourceDoc = sourceState.doc;
    const measurementDoc = measurementState.doc;
    const docsMatch = measurementDoc?.eq?.(sourceDoc);

    if (docsMatch) {
      return false;
    }

    let syncedDoc;
    try {
      const schema = measurementState.schema ?? measurementEditor.schema;
      syncedDoc = schema.nodeFromJSON(sourceDoc.toJSON());
    } catch (error) {
      this.#logDevelopmentWarning('Failed to sync measurement editor state', error);
      return false;
    }

    const nextState = EditorState.create({
      schema: measurementState.schema,
      doc: syncedDoc,
      plugins: measurementState.plugins,
    });

    measurementView.updateState(nextState);
    return true;
  }

  /**
   * Read page dimensions from the converter and normalize them to pixel values.
   * @returns {void}
   */
  #initDocumentSizes() {
    const { pageMargins, pageSize } = this.editor?.converter?.pageStyles || {};
    this.pageMargins = normalizeInchesToPx(pageMargins);
    this.pageSize = normalizeInchesToPx(pageSize);
  }

  /**
   * Creates a deep clone of the layout package for baseline comparison.
   * Tries structuredClone first, falls back to JSON serialization.
   * @param {object|null} layout - Layout to clone
   * @returns {object|null} Cloned layout or null
   */
  #cloneLayoutPackage(layout) {
    if (!layout) return null;

    // Try structuredClone if available
    const structuredCloneFn =
      typeof globalThis !== 'undefined' && typeof globalThis.structuredClone === 'function'
        ? globalThis.structuredClone
        : null;

    if (structuredCloneFn) {
      try {
        return structuredCloneFn(layout);
      } catch {
        // Fall through to JSON method
      }
    }

    // Fallback to JSON serialization
    try {
      return JSON.parse(JSON.stringify(layout));
    } catch {
      // Last resort: shallow copy
      return { ...layout };
    }
  }

  /**
   * Extracts pages from layout and filters to only finite break positions.
   * @param {object|null} layout - Layout package
   * @returns {Array} Array of valid page breaks
   */
  #extractValidPageBreaks(layout) {
    const pages = Array.isArray(layout?.pages) ? layout.pages : [];
    return pages.filter((page) => Number.isFinite(page?.break?.top));
  }

  /**
   * Recompute pagination for the mirrored document and update downstream consumers.
   * @returns {object} Latest layout package emitted by `generatePageBreaks`.
   */
  calculatePageBreaks() {
    const params = {
      pageHeightPx: this.pageSize?.height || MeasurementEngine.DEFAULT_PAGE_HEIGHT_IN_PX,
      pageWidthPx: this.pageSize?.width || null,
      marginsPx: this.pageMargins,
      resolveHeaderFooter: this.#resolveHeaderFooterForPage.bind(this),
    };

    const layoutPackage = generatePageBreaks(this.measurementEditor, params);

    // Attach header/footer summary to the layout
    if (layoutPackage && typeof layoutPackage === 'object') {
      layoutPackage.headerFooterSummary = this.headerFooterSummary;
    }

    // Store current layout and create baseline copy for comparison
    this.layoutPackage = layoutPackage;
    this.baselineLayoutPackage = this.#cloneLayoutPackage(layoutPackage);
    this.fieldSegments = Array.isArray(layoutPackage?.fieldSegments) ? layoutPackage.fieldSegments : [];
    this.pageBreaks = this.#extractValidPageBreaks(layoutPackage);

    this.#markReady();
    this.editor?.commands?.updatePagination?.(layoutPackage);

    return layoutPackage;
  }

  /**
   * Apply a pre-computed pagination layout without re-running measurement.
   * Useful for developer tooling that wants to inject manual overrides.
   * @param {object} layout
   * @param {{ source?: string }} [options]
   * @returns {object|null} Applied layout package or null when ignored.
   */
  applyLayoutOverride(layout, { source = 'manual-override' } = {}) {
    if (!layout || typeof layout !== 'object') {
      return null;
    }

    // Ensure layout has a headerFooterSummary
    if (layout.headerFooterSummary && typeof layout.headerFooterSummary === 'object') {
      this.headerFooterSummary = layout.headerFooterSummary;
    } else if (!layout.headerFooterSummary && this.headerFooterSummary) {
      layout.headerFooterSummary = this.headerFooterSummary;
    }

    // Update current layout (preserve baseline - only calculatePageBreaks should update it)
    this.layoutPackage = layout;
    this.fieldSegments = Array.isArray(layout?.fieldSegments) ? layout.fieldSegments : [];
    this.pageBreaks = this.#extractValidPageBreaks(layout);

    // Notify consumers
    this.editor?.commands?.updatePagination?.(layout);
    this.config?.onPageBreaksUpdate?.(layout);

    this.#safeCleanup(
      () => this.emit?.('page-breaks-updated', { layout, source }),
      'Failed to emit page-breaks-updated event',
    );

    return layout;
  }

  /**
   * Flag the measurement engine as ready after at least one pagination pass.
   * @returns {void}
   */
  #markReady() {
    if (this.#ready) return;
    if (!this.measurementEditor?.view) return;

    this.#ready = true;
    this.#resolveReady?.(true);
    this.#resolveReady = null;
  }

  /**
   * @returns {boolean} True once the measurement editor is initialized and pagination has run.
   */
  isReady() {
    return this.#ready;
  }

  /**
   * Await the asynchronous setup process for consumers that need pagination before continuing.
   * @returns {Promise<boolean>} Resolves once initialization finishes (false when destroyed early).
   */
  awaitReady() {
    return this.readyPromise;
  }

  /**
   * Tear down the measurement editor and release DOM resources.
   * @returns {void}
   */
  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;

    this.#removeEventListeners();

    const measurementElement = this.measurementEditor?.element || this.measurementElement;

    if (!this.#ready) {
      this.#resolveReady?.(false);
    }
    this.#resolveReady = null;
    this.readyPromise = Promise.resolve(this.#ready);

    this.#destroyMeasurementEditor();
    this.#cleanupDOMElement(measurementElement);
    this.#clearReferences();
  }

  /**
   * Log a warning message in development mode only.
   * @param {string} message - Warning message
   * @param {Error} [error] - Optional error object
   * @returns {void}
   */
  #logDevelopmentWarning(message, error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(error ? `${message}:` : message, error || '');
    }
  }

  /**
   * Safely execute a cleanup function, logging errors in development.
   * @param {Function} cleanupFn - Cleanup function to execute
   * @param {string} errorContext - Context description for error logging
   * @returns {void}
   */
  #safeCleanup(cleanupFn, errorContext) {
    try {
      cleanupFn?.();
    } catch (error) {
      this.#logDevelopmentWarning(errorContext, error);
    }
  }

  /**
   * Remove listeners registered on the measurement engine and host editor.
   * @returns {void}
   */
  #removeEventListeners() {
    this.#safeCleanup(
      () => this.off?.('page-breaks-updated', this.config.onPageBreaksUpdate),
      'Failed to remove page-breaks-updated listener',
    );

    this.#safeCleanup(
      () => this.editor?.off?.('transaction', this.#onTransaction),
      'Failed to remove transaction listener',
    );

    this.#safeCleanup(
      () => this.measurementEditor?.off?.('create', this.#onMeasurementEditorCreate),
      'Failed to remove create listener',
    );
  }

  /**
   * Destroy the ProseMirror measurement editor instance.
   * @returns {void}
   */
  #destroyMeasurementEditor() {
    this.#safeCleanup(() => this.measurementEditor?.destroy?.(), 'Failed to destroy measurement editor');
  }

  /**
   * Remove the measurement DOM element when owned by the engine.
   * @param {HTMLElement|null} measurementElement
   * @returns {void}
   */
  #cleanupDOMElement(measurementElement) {
    if (!this.#hasExternalElement && measurementElement?.parentNode) {
      measurementElement.parentNode.removeChild(measurementElement);
    }
  }

  /**
   * Clear internal references to aid garbage collection.
   * @returns {void}
   */
  #clearReferences() {
    this.measurementEditor = null;
    this.measurementElement = null;
    this.layoutPackage = null;
    this.pageBreaks = [];
    this.fieldSegments = [];

    if (this.editor && this.editor.measurement === this) {
      delete this.editor.measurement;
    }
  }

  /**
   * Measure the active header/footer repository so pagination can incorporate section overrides.
   * @returns {Promise<void>|undefined} Promise that resolves when measurement completes.
   */
  async #initHeaderFooterMeasurements() {
    if (!this.headerFooterRepository) {
      return;
    }

    this.headerFooterPromise = measureHeaderFooterSections({
      editor: this.editor,
      repository: this.headerFooterRepository,
    })
      .then((summary) => {
        if (summary) {
          this.headerFooterSummary = summary;
        }
      })
      .catch((error) => {
        this.#logDevelopmentWarning('Failed to measure header/footer sections', error);
      })
      .finally(() => {
        this.calculatePageBreaks();
      });

    return this.headerFooterPromise;
  }

  /**
   * Resolve header/footer metadata for the requested page index.
   * @param {number} pageIndex
   * @param {{ isLastPage?: boolean }} [options]
   * @returns {{ header: { id: string|null, metrics: object|null, heightPx: number|null }, footer: { id: string|null, metrics: object|null, heightPx: number|null } }}
   */
  #resolveHeaderFooterForPage(pageIndex, { isLastPage = false } = {}) {
    return resolveHeaderFooterForPage({
      variantLookup: this.headerFooterSummary.variantLookup,
      metricsById: this.headerFooterSummary.sectionMetricsById,
      pageIndex,
      isLastPage,
    });
  }

  /**
   * Re-run header/footer measurements when repository content changes.
   * @returns {Promise<void>|undefined}
   */
  async refreshHeaderFooterMeasurements() {
    if (!this.headerFooterRepository) return;
    await this.#initHeaderFooterMeasurements();
  }

  /**
   * @returns {{ sectionMetricsById: Map<string, object>, variantLookup: {header: Map<string, string>, footer: Map<string, string>}, contentWidthPx: number|null, distancesPx: {header: number, footer: number} }} Latest cached header/footer summary.
   */
  getHeaderFooterSummary() {
    return this.headerFooterSummary;
  }

  /**
   * @returns {import('prosemirror-view').EditorView|null} Live measurement editor view when available.
   */
  getView() {
    return this.measurementEditor?.view || null;
  }
}
