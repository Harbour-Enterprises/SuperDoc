import { EditorState } from 'prosemirror-state';
import { createMeasurementEditor, normalizeInchesToPx, generatePageBreaks } from './helpers/index.js';
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
  #onTransaction = ({ transaction }) => {
    if (!transaction.docChanged) return;

    const synced = this.#syncMeasurementEditorState();
    if (!synced) return;

    this.calculatePageBreaks();
  };

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
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to sync measurement editor state:', error);
      }
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
    const { pageMargins, pageSize } = this.editor.converter.pageStyles || {};
    this.pageMargins = normalizeInchesToPx(pageMargins);
    this.pageSize = normalizeInchesToPx(pageSize);
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
    const pages = Array.isArray(layoutPackage?.pages) ? layoutPackage.pages : [];

    this.layoutPackage = layoutPackage;
    this.fieldSegments = Array.isArray(layoutPackage?.fieldSegments) ? layoutPackage.fieldSegments : [];
    this.pageBreaks = pages.filter((page) => Number.isFinite(page?.break?.top));

    this.#markReady();
    this.editor.commands.updatePagination(layoutPackage);

    return layoutPackage;
  }

  /**
   * Ensure the engine has produced at least one layout before resolving readiness.
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

  #removeEventListeners() {
    try {
      this.off('page-breaks-updated', this.config.onPageBreaksUpdate);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to remove page-breaks-updated listener:', error);
      }
    }

    try {
      this.editor?.off?.('transaction', this.#onTransaction);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to remove transaction listener:', error);
      }
    }

    try {
      this.measurementEditor?.off?.('create', this.#onMeasurementEditorCreate);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to remove create listener:', error);
      }
    }
  }

  #destroyMeasurementEditor() {
    try {
      this.measurementEditor?.destroy?.();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to destroy measurement editor:', error);
      }
    }
  }

  #cleanupDOMElement(measurementElement) {
    if (!this.#hasExternalElement && measurementElement?.parentNode) {
      measurementElement.parentNode.removeChild(measurementElement);
    }
  }

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
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to measure header/footer sections:', error);
        }
      })
      .finally(() => {
        this.calculatePageBreaks();
      });

    return this.headerFooterPromise;
  }

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
