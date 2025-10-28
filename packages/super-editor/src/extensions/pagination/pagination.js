import { Extension } from '@core/Extension.js';
import { resolveSectionIdFromSummary, resolveSectionIdForPage } from './plugin/helpers/page-bands.js';
import { getSectionPreviewClone } from './plugin/helpers/section-preview.js';
import {
  createHeaderFooterEditor,
  broadcastEditorEvents,
  PaginationPluginKey as LegacyPaginationPluginKey,
} from './pagination-helpers.js';
import { createHeaderFooterRepository } from './header-footer-repository.js';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration } from 'prosemirror-view';
import { DecorationSet } from 'prosemirror-view';

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
    const existingHandle = storage[REPOSITORY_INIT_TIMER_KEY];
    if (existingHandle) {
      cancelScheduledHandle(existingHandle);
      storage[REPOSITORY_INIT_TIMER_KEY] = null;
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
  const options = editor.options || {};
  if (!options.pagination) return false;
  if (options.isHeadless) return false;
  if (options.isHeaderOrFooter) return false;
  return true;
}

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
  } catch (error) {
    try {
      console.debug('[pagination] failed to initialize header/footer repository', error);
    } catch {
      // no-op if console.debug is unavailable
    }
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

  const createSpacingElement = ({ heightPx, pageIndex, kind }) => {
    const element = domSource.createElement('div');
    element.className = 'pagination-spacing-highlight';
    element.style.display = 'block';
    element.style.width = '100%';
    element.style.boxSizing = 'border-box';
    element.style.pointerEvents = 'none';
    element.style.height = `${heightPx}px`;
    element.style.minHeight = `${heightPx}px`;
    element.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
    element.style.border = '1px solid rgba(220, 38, 38, 0.55)';
    element.style.borderRadius = '3px';
    element.style.margin = '0';
    element.dataset.paginationSpacing = 'true';
    element.dataset.paginationSpacingHeight = String(heightPx);
    element.dataset.paginationPageIndex = String(pageIndex);
    if (kind) {
      element.dataset.paginationSpacingKind = kind;
    }
    return element;
  };

  const firstPage = pages[0] ?? null;
  const firstHeaderEffective = Number.isFinite(firstPage?.headerFooterAreas?.header?.metrics?.effectiveHeightPx)
    ? firstPage.headerFooterAreas.header.metrics.effectiveHeightPx
    : Number.isFinite(firstPage?.metrics?.headerHeightPx)
      ? firstPage.metrics.headerHeightPx
      : null;
  const firstHeaderMargin = Number.isFinite(firstPage?.metrics?.marginTopPx) ? firstPage.metrics.marginTopPx : null;
  const leadingHeaderHeight =
    Number.isFinite(firstHeaderEffective) || Number.isFinite(firstHeaderMargin)
      ? Math.max(firstHeaderEffective ?? 0, firstHeaderMargin ?? 0, 0)
      : null;
  if (Number.isFinite(leadingHeaderHeight) && leadingHeaderHeight > 0) {
    const leadingWidget = Decoration.widget(
      0,
      () =>
        createSpacingElement({
          heightPx: leadingHeaderHeight,
          pageIndex: 0,
          kind: 'leading-header',
        }),
      {
        key: `pagination-leading-header-${Math.round(leadingHeaderHeight)}`,
        side: -1,
      },
    );
    decorations.push(leadingWidget);
  }

  const totalPages = pages.length;
  pages.forEach((pageEntry, index) => {
    const breakInfo = pageEntry?.break ?? null;
    if (!breakInfo) return;

    if (!Number.isFinite(breakInfo.pos) || breakInfo.pos < 0) {
      return;
    }

    const isLastPage = index === totalPages - 1;
    if (isLastPage) return;

    const effectivePos = breakInfo.pos;

    const metrics = pageEntry?.metrics ?? {};
    const footerHeight = Number.isFinite(metrics?.footerHeightPx) ? metrics.footerHeightPx : 0;
    const footerMargin = Number.isFinite(metrics?.marginBottomPx) ? metrics.marginBottomPx : footerHeight;
    const footerReserved = Math.max(footerHeight, footerMargin, 0);
    const pageBottomSpacing = Number.isFinite(pageEntry?.pageBottomSpacingPx) ? pageEntry.pageBottomSpacingPx : 0;

    const nextPage = pages[index + 1] ?? null;
    const nextMetrics = nextPage?.metrics ?? {};
    const nextHeaderHeight = Number.isFinite(nextMetrics?.headerHeightPx) ? nextMetrics.headerHeightPx : 0;
    const nextHeaderMargin = Number.isFinite(nextMetrics?.marginTopPx) ? nextMetrics.marginTopPx : nextHeaderHeight;
    const nextHeaderReserved = Math.max(nextHeaderHeight, nextHeaderMargin, 0);
    const nextPageGap = Number.isFinite(nextMetrics?.pageGapPx) ? nextMetrics.pageGapPx : 0;

    const totalSpace = pageBottomSpacing + footerReserved + nextHeaderReserved + nextPageGap;
    if (!(totalSpace > 0)) return;

    const createChrome = () => {
      return createSpacingElement({
        heightPx: totalSpace,
        pageIndex: index,
        kind: 'page-spacing',
      });
    };

    const widget = Decoration.widget(effectivePos, createChrome, {
      key: `pagination-spacing-${index}-${effectivePos}`,
      side: -1,
      ignoreSelection: true,
    });
    decorations.push(widget);

    const mirroredWidgets = mirrorSpacingWidgetAcrossRow({
      editor,
      doc,
      basePos: effectivePos,
      createChrome,
      keyBase: `pagination-spacing-${index}`,
    });
    if (mirroredWidgets.length) {
      decorations.push(...mirroredWidgets);
    }
  });

  if (!decorations.length) {
    return DecorationSet.empty;
  }

  return DecorationSet.create(doc, decorations);
};

const TABLE_CELL_NODE_NAMES = new Set(['tableCell', 'tableHeader']);
const TABLE_ROW_NODE_NAMES = new Set(['tableRow', 'row']);

/**
 * Mirrors spacing widgets across table rows to keep gutters aligned in complex layouts.
 * @param {{ editor: import('@core/Editor.js').Editor, doc: import('prosemirror-model').Node, basePos: number, createChrome: () => HTMLElement, keyBase: string }} params
 * @returns {Decoration[]}
 */
const mirrorSpacingWidgetAcrossRow = ({ editor, doc, basePos, createChrome, keyBase }) => {
  const view = editor?.view;
  if (!view || !doc) {
    return [];
  }
  const docSize = doc?.content?.size ?? null;
  if (!Number.isFinite(basePos) || basePos < 0 || (Number.isFinite(docSize) && basePos > docSize)) {
    return [];
  }

  let resolved = null;
  try {
    const safePos = Number.isFinite(docSize) ? Math.max(0, Math.min(basePos, docSize)) : Math.max(0, basePos);
    resolved = doc.resolve(safePos);
  } catch {
    return [];
  }

  const context = resolveTableRowContext(resolved);
  if (!context) {
    return [];
  }

  let breakY = null;
  if (typeof view?.coordsAtPos === 'function') {
    try {
      const coords = view.coordsAtPos(Math.max(0, Math.min(basePos, docSize ?? basePos)));
      if (coords) {
        if (Number.isFinite(coords.top)) {
          breakY = coords.top;
        } else if (Number.isFinite(coords.bottom)) {
          breakY = coords.bottom;
        }
      }
    } catch {}
  }

  const cells = [];
  let baseCellIndex = -1;
  let cellCursor = context.rowPos + 1;
  for (let cellIndex = 0; cellIndex < context.rowNode.childCount; cellIndex += 1) {
    const cellNode = context.rowNode.child(cellIndex);
    const cellStart = cellCursor;
    const cellEnd = cellStart + cellNode.nodeSize;
    cellCursor = cellEnd;

    if (baseCellIndex === -1 && basePos >= cellStart && basePos <= cellEnd) {
      baseCellIndex = cellIndex;
    }

    const rect = getTableCellRect(view, cellStart);
    cells.push({
      cellNode,
      cellStart,
      cellEnd,
      rect,
    });
  }

  const baseCell = baseCellIndex >= 0 ? (cells[baseCellIndex] ?? null) : null;
  let targetOffset = null;
  let fallbackFraction = null;
  let baseRelativePos = null;
  if (baseCell && Number.isFinite(basePos)) {
    const { innerStart: baseInnerStart, innerEnd: baseInnerEnd } = getCellInnerBounds(
      baseCell.cellStart,
      baseCell.cellNode,
      docSize,
    );
    if (baseInnerEnd >= baseInnerStart) {
      const boundedBasePos = clampNumber(basePos, baseInnerStart, baseInnerEnd);
      baseRelativePos = boundedBasePos - baseCell.cellStart;
    }
  }
  if (baseCell?.rect && Number.isFinite(breakY)) {
    const baseTop = baseCell.rect.top;
    const baseBottom = baseCell.rect.bottom;
    if (Number.isFinite(baseTop) && Number.isFinite(baseBottom) && baseBottom > baseTop) {
      const span = baseBottom - baseTop;
      const rawOffset = breakY - baseTop;
      targetOffset = clampNumber(rawOffset, 0, span);
      fallbackFraction = clampNumber(rawOffset / span, 0, 1);
    }
  }

  const widgets = [];
  const insertedPositions = new Set([Number.isFinite(basePos) ? basePos : 0]);

  cells.forEach((cell, cellIndex) => {
    const isSourceCell =
      baseCellIndex >= 0 ? cellIndex === baseCellIndex : basePos >= cell.cellStart && basePos <= cell.cellEnd;
    if (isSourceCell) {
      return;
    }

    const { innerStart, innerEnd } = getCellInnerBounds(cell.cellStart, cell.cellNode, docSize);
    let targetPos = null;

    if (Number.isFinite(baseRelativePos)) {
      const candidate = clampNumber(cell.cellStart + baseRelativePos, innerStart, innerEnd);
      if (Number.isFinite(candidate)) {
        targetPos = candidate;
      }
    }

    let targetY = null;
    if (!Number.isFinite(targetPos)) {
      targetY = resolveTargetYForCell({
        cellRect: cell.rect,
        baseOffset: targetOffset,
        baseFraction: fallbackFraction,
        fallbackY: breakY,
      });
    }

    targetPos = resolveCellInsertionPos({
      view,
      doc,
      cellStart: cell.cellStart,
      cellNode: cell.cellNode,
      targetY,
      cellRect: cell.rect,
      innerStart,
      innerEnd,
      preferredPos: targetPos,
    });

    if (!Number.isFinite(targetPos) || insertedPositions.has(targetPos)) {
      return;
    }
    insertedPositions.add(targetPos);

    const decoration = Decoration.widget(targetPos, createChrome, {
      key: `${keyBase}-cell-${cellIndex}-${targetPos}`,
      side: -1,
      ignoreSelection: true,
    });
    widgets.push(decoration);
  });

  return widgets;
};

/**
 * Resolves the bounding rectangle for a table cell at a given document position.
 * @param {import('prosemirror-view').EditorView} view
 * @param {number} cellPos
 * @returns {DOMRect|null}
 */
const getTableCellRect = (view, cellPos) => {
  if (!view || typeof view.nodeDOM !== 'function') {
    return null;
  }
  try {
    const dom = view.nodeDOM(cellPos);
    if (dom && typeof dom.getBoundingClientRect === 'function') {
      return dom.getBoundingClientRect();
    }
  } catch {}
  return null;
};

/**
 * Resolves a vertical coordinate within a table cell for mirroring purposes.
 * @param {{ cellRect: DOMRect|null, baseOffset: number|null, baseFraction: number|null, fallbackY: number|null }} params
 * @returns {number|null}
 */
const resolveTargetYForCell = ({ cellRect, baseOffset, baseFraction, fallbackY }) => {
  if (cellRect && Number.isFinite(cellRect.top) && Number.isFinite(cellRect.bottom) && cellRect.bottom > cellRect.top) {
    if (Number.isFinite(baseOffset)) {
      const span = cellRect.bottom - cellRect.top;
      const offset = clampNumber(baseOffset, 0, span);
      return cellRect.top + offset;
    }
    if (Number.isFinite(baseFraction)) {
      const span = cellRect.bottom - cellRect.top;
      const fraction = clampNumber(baseFraction, 0, 1);
      return cellRect.top + span * fraction;
    }
    if (Number.isFinite(fallbackY)) {
      return clampNumber(fallbackY, cellRect.top, cellRect.bottom);
    }
    return cellRect.bottom;
  }
  return Number.isFinite(fallbackY) ? fallbackY : null;
};

/**
 * Locates the table row context for a resolved position when mirroring decorations.
 * @param {import('prosemirror-model').ResolvedPos} resolvedPos
 * @returns {{ rowNode: import('prosemirror-model').Node, rowPos: number }|null}
 */
const resolveTableRowContext = (resolvedPos) => {
  if (!resolvedPos) return null;

  let rowDepth = -1;
  let cellDepth = -1;

  for (let depth = resolvedPos.depth; depth >= 0; depth -= 1) {
    const node = resolvedPos.node(depth);
    const name = node?.type?.name ?? null;
    if (cellDepth === -1 && TABLE_CELL_NODE_NAMES.has(name)) {
      cellDepth = depth;
    }
    if (TABLE_ROW_NODE_NAMES.has(name)) {
      rowDepth = depth;
      if (cellDepth !== -1) {
        break;
      }
    }
  }

  if (rowDepth === -1 || cellDepth === -1 || cellDepth <= rowDepth) {
    return null;
  }

  const rowNode = resolvedPos.node(rowDepth);
  if (!rowNode) {
    return null;
  }

  const rowPos = rowDepth > 0 ? resolvedPos.before(rowDepth) : 0;
  return {
    rowNode,
    rowPos,
  };
};

/**
 * Computes the inner positional bounds of a table cell.
 * @param {number} cellStart
 * @param {import('prosemirror-model').Node} cellNode
 * @param {number|null} docSize
 * @returns {{ innerStart: number, innerEnd: number }}
 */
const getCellInnerBounds = (cellStart, cellNode, docSize) => {
  const innerStart = clampToDoc(cellStart + 1, docSize);
  const innerEnd = clampToDoc(cellStart + Math.max(1, cellNode.nodeSize - 1), docSize);
  return { innerStart, innerEnd };
};

/**
 * Determines the best insertion position inside a table cell for mirrored decorations.
 * @param {{ view: import('prosemirror-view').EditorView, doc: import('prosemirror-model').Node, cellStart: number, cellNode: import('prosemirror-model').Node, targetY: number|null, cellRect: DOMRect|null, innerStart?: number, innerEnd?: number, preferredPos?: number|null }} params
 * @returns {number}
 */
const resolveCellInsertionPos = ({
  view,
  doc,
  cellStart,
  cellNode,
  targetY,
  cellRect,
  innerStart: providedInnerStart,
  innerEnd: providedInnerEnd,
  preferredPos,
}) => {
  const docSize = doc?.content?.size ?? null;
  const { innerStart, innerEnd } =
    providedInnerStart != null && providedInnerEnd != null
      ? { innerStart: providedInnerStart, innerEnd: providedInnerEnd }
      : getCellInnerBounds(cellStart, cellNode, docSize);

  if (innerEnd < innerStart) {
    return innerStart;
  }

  if (!view) {
    return innerEnd;
  }

  if (Number.isFinite(preferredPos)) {
    return clampNumber(preferredPos, innerStart, innerEnd);
  }

  let rect = cellRect ?? null;
  if (!rect && typeof view.nodeDOM === 'function') {
    try {
      const cellDom = view.nodeDOM(cellStart);
      if (cellDom && typeof cellDom.getBoundingClientRect === 'function') {
        rect = cellDom.getBoundingClientRect();
      }
    } catch {}
  }

  if (!rect) {
    return innerEnd;
  }

  const verticalRange = rect.bottom - rect.top;
  const safeTargetY = Number.isFinite(targetY)
    ? clampNumber(targetY, rect.top, rect.bottom)
    : rect.bottom - Math.min(Math.max(verticalRange * 0.1, 0.5), 2);

  const horizontalRange = rect.right - rect.left;
  const horizontalProbe =
    Number.isFinite(horizontalRange) && horizontalRange > 0 ? horizontalRange / 2 : Math.max(horizontalRange, 1);
  const defaultX = rect.left + horizontalProbe;
  const safeX = clampNumber(defaultX, rect.left, rect.right);

  let measuredPos = null;
  if (typeof view.posAtCoords === 'function') {
    try {
      const probe = view.posAtCoords({ left: safeX, top: safeTargetY });
      if (probe && Number.isFinite(probe.pos)) {
        measuredPos = probe.pos;
      }
    } catch {}
  }

  let result = Number.isFinite(measuredPos) ? measuredPos : innerEnd;
  result = Math.max(innerStart, Math.min(result, innerEnd));
  if (Number.isFinite(docSize)) {
    result = Math.max(0, Math.min(result, docSize));
  }
  return result;
};

/**
 * Clamps a numeric value between provided bounds.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clampNumber = (value, min, max) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    if (Number.isFinite(min)) return min;
    if (Number.isFinite(max)) return max;
    return value;
  }
  if (Number.isFinite(min) && numeric < min) {
    return min;
  }
  if (Number.isFinite(max) && numeric > max) {
    return max;
  }
  return numeric;
};

/**
 * Clamps a value to valid document positions.
 * @param {number} value
 * @param {number|null} docSize
 * @returns {number}
 */
const clampToDoc = (value, docSize) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (Number.isFinite(docSize)) {
    if (numeric < 0) return 0;
    if (numeric > docSize) return docSize;
  }
  return numeric;
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
  let fallbackTop = 0;
  let fallbackGap = 0;

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index] ?? null;
    const metrics = page?.metrics ?? {};
    const pageHeightPx = Number(metrics?.pageHeightPx) || 0;

    const pageTop = Number.isFinite(page?.pageTopOffsetPx) ? page.pageTopOffsetPx : fallbackTop;
    const pageGap = Number.isFinite(page?.pageGapPx) ? page.pageGapPx : fallbackGap;

    insertPageChrome(editor, storage, mount, viewContainer, index, pageTop, layout);

    fallbackTop = pageTop + pageHeightPx + pageGap;
    fallbackGap = pageGap;
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
  const pageView = editor.view.dom.ownerDocument.createElement('div');
  pageView.className = 'super-editor-page-view super-editor-base-page';
  pageView.style.top = pageTop + 'px';

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
  const backgroundHost = viewContainer?.parentNode ?? null;
  if (backgroundHost) {
    backgroundHost.insertBefore(pageBackgroundView, viewContainer);
    if (storage?.pageChromeNodes) {
      storage.pageChromeNodes.push(pageBackgroundView);
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

  if (sectionType === 'header') {
    sectionDiv.classList.add('super-editor-page-header');
  } else if (sectionType === 'footer') {
    sectionDiv.classList.add('super-editor-page-footer');
  }

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

  const pages = Array.isArray(layout?.pages) ? layout.pages : [];
  const currentPageSection =
    pages.find((p) => Number.isInteger(p?.pageIndex) && p.pageIndex === pageIndex) ?? pages[pageIndex] ?? {};
  const headerFooterAreas = currentPageSection?.headerFooterAreas ?? {};
  const metrics = currentPageSection?.metrics ?? {};
  const section = headerFooterAreas?.[sectionType] ?? {};

  const marginKey = sectionType === 'header' ? 'marginTopPx' : 'marginBottomPx';
  const marginValue = Number(metrics?.[marginKey]);
  const sectionHeight = Number(section?.heightPx);
  const resolvedHeight = Math.max(
    Number.isFinite(marginValue) ? marginValue : 0,
    Number.isFinite(sectionHeight) ? sectionHeight : 0,
  );

  if (resolvedHeight > 0) {
    sectionDiv.style.height = `${resolvedHeight}px`;
  }

  const storage = editor?.storage?.pagination ?? {};
  const summary = storage?.headerFooterSummary ?? null;
  const isLastPage = sectionType === 'footer' && pageIndex === pages.length - 1;

  let sectionId =
    resolveSectionIdFromSummary(summary, sectionType, pageIndex, isLastPage) ??
    (typeof section?.id === 'string' ? section.id : null) ??
    (typeof section?.sectionId === 'string' ? section.sectionId : null) ??
    (typeof section?.areaId === 'string' ? section.areaId : null);

  if (!sectionId) {
    const converterKey = sectionType === 'header' ? 'headerIds' : 'footerIds';
    sectionId = resolveSectionIdForPage(editor, pageIndex + 1, converterKey);
  }

  if (sectionId && storage) {
    const bucketKey = sectionType === 'header' ? 'headers' : 'footers';
    const ensureSectionStore = () => {
      if (!storage.sectionData || typeof storage.sectionData !== 'object') {
        storage.sectionData = { headers: {}, footers: {} };
      }
      if (!storage.sectionData[bucketKey] || typeof storage.sectionData[bucketKey] !== 'object') {
        storage.sectionData[bucketKey] = {};
      }
      return storage.sectionData[bucketKey];
    };

    const bucketStore = ensureSectionStore();
    const existingEntry = bucketStore[sectionId] ?? null;
    const hasData = existingEntry && existingEntry.data != null;

    if (!hasData) {
      const repoRecord = storage.repository?.get?.(sectionId) ?? null;
      if (repoRecord?.contentJson) {
        const nextEntry = {
          ...existingEntry,
          data: repoRecord.contentJson,
        };
        if (!Number.isFinite(nextEntry.reservedHeight) && Number.isFinite(resolvedHeight) && resolvedHeight > 0) {
          nextEntry.reservedHeight = resolvedHeight;
        }
        bucketStore[sectionId] = nextEntry;
      }
    } else if (
      Number.isFinite(resolvedHeight) &&
      resolvedHeight > 0 &&
      !Number.isFinite(existingEntry.reservedHeight)
    ) {
      bucketStore[sectionId] = {
        ...existingEntry,
        reservedHeight: resolvedHeight,
      };
    }
  }

  const pageNumber = pageIndex + 1;
  const content = sectionId != null ? getSectionPreviewClone(editor, sectionType, sectionId, { pageNumber }) : null;

  const slot = editor.view.dom.ownerDocument.createElement('div');
  slot.className = 'super-editor-page-section-slot';
  slot.style.position = 'absolute';
  slot.style.display = 'flex';
  slot.style.flexDirection = 'column';
  slot.style.overflow = 'hidden';
  slot.style.pointerEvents = 'none';

  hitArea.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    activateHeaderFooterEditor({
      editor,
      storage,
      sectionType,
      sectionId,
      pageNumber,
      pageIndex,
      slot,
      hitArea,
      resolvedHeight,
    });
  });

  const marginLeft = Number(metrics?.marginLeftPx);
  const marginRight = Number(metrics?.marginRightPx);
  if (Number.isFinite(marginLeft) && marginLeft > 0) {
    slot.style.left = `${Math.round(marginLeft)}px`;
  } else {
    slot.style.left = '0';
  }
  if (Number.isFinite(marginRight) && marginRight > 0) {
    slot.style.right = `${Math.round(marginRight)}px`;
  } else {
    slot.style.right = '0';
  }

  const offsetPx = Number.isFinite(section?.metrics?.offsetPx)
    ? section.metrics.offsetPx
    : Number.isFinite(section?.metrics?.distancePx)
      ? section.metrics.distancePx
      : null;
  const resolvedOffset = Number.isFinite(offsetPx) ? Math.max(offsetPx, 0) : 0;
  const maxOffset = Number.isFinite(resolvedHeight) ? Math.max(resolvedHeight, 0) : resolvedOffset;
  const effectiveOffset = Math.min(resolvedOffset, maxOffset);
  const contentHeight = Number.isFinite(section?.metrics?.contentHeightPx)
    ? Math.max(section.metrics.contentHeightPx, 0)
    : null;
  let slotHeight = Number.isFinite(contentHeight) ? contentHeight : null;
  if (!Number.isFinite(slotHeight)) {
    slotHeight = Number.isFinite(resolvedHeight) ? Math.max(resolvedHeight - effectiveOffset, 0) : null;
  }

  if (sectionType === 'header') {
    slot.style.top = `${Math.round(effectiveOffset)}px`;
    slot.style.bottom = 'auto';
    slot.style.justifyContent = 'flex-start';
  } else {
    slot.style.bottom = `${Math.round(effectiveOffset)}px`;
    slot.style.top = 'auto';
    slot.style.justifyContent = 'flex-end';
  }
  if (Number.isFinite(slotHeight)) {
    const allowedHeight = Number.isFinite(resolvedHeight) ? Math.min(slotHeight, resolvedHeight) : slotHeight;
    const clampedHeight = Math.max(0, Math.round(allowedHeight));
    slot.style.height = `${clampedHeight}px`;
    slot.style.maxHeight = `${clampedHeight}px`;
  } else {
    slot.style.height = 'auto';
    slot.style.removeProperty('max-height');
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
  slot.dataset.paginationOffset = String(Math.round(effectiveOffset));

  const contentNode =
    content ??
    (() => {
      const placeholder = editor.view.dom.ownerDocument.createElement('div');
      placeholder.innerText = `${sectionType.toUpperCase()} for page ${pageNumber}`;
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = sectionType === 'header' ? 'flex-start' : 'flex-end';
      placeholder.style.justifyContent = 'center';
      placeholder.style.height = '100%';
      placeholder.style.fontSize = '12px';
      placeholder.style.color = '#6b7280';
      return placeholder;
    })();

  contentNode.dataset.paginationSection = sectionType;
  contentNode.dataset.paginationSectionRole = 'overlay-content';
  contentNode.dataset.paginationPage = String(pageNumber);
  if (sectionId) {
    contentNode.dataset.paginationSectionId = sectionId;
  }
  contentNode.dataset.paginationOffset = String(Math.round(effectiveOffset));
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
  // if (!editor?.view?.dom) return null;
  // const cached = storage?.pageViewElement;
  // if (cached && cached.isConnected) return cached;

  clearPageChrome(storage);
  generatePageView(editor, storage, breaks);
  // if (storage) {
  //   storage.pageViewElement = pageView;
  // }
  // return pageView;
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
    console.debug('[pagination] header/footer edit aborted - slot not connected', {
      sectionType,
      sectionId,
      pageNumber,
      pageIndex,
    });
    return;
  }

  if (!sectionId) {
    console.debug('[pagination] header/footer edit aborted - missing section id', {
      sectionType,
      pageNumber,
      pageIndex,
    });
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
    console.debug('[pagination] header/footer edit aborted - missing owner document', {
      sectionType,
      sectionId,
      pageNumber,
    });
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
    } catch (error) {
      console.debug('[pagination] header/footer editor focus failed', error);
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
  } catch (error) {
    console.debug('[pagination] header/footer editor teardown failed', error);
  }

  const hasRemaining = hasActiveHeaderFooterEditor(map);
  if (!hasRemaining) {
    setMainEditorHeaderFooterUi(editor, storage, false);
    const container = entry.slot?.closest?.('.super-editor-page-section');
    container?.classList.remove('editing');
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

  if (!state.active) return;
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
