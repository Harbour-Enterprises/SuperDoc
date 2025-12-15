import { NodeSelection, TextSelection } from 'prosemirror-state';
import { CellSelection, TableMap } from 'prosemirror-tables';
import type { EditorState, Transaction } from 'prosemirror-state';
import { Editor } from './Editor.js';
import { EventEmitter } from './EventEmitter.js';
import { toFlowBlocks } from '@superdoc/pm-adapter';
import {
  incrementalLayout,
  selectionToRects,
  clickToPosition,
  getFragmentAtPosition,
  computeLinePmRange,
  measureCharacterX,
  pmPosToCharOffset,
  extractIdentifierFromConverter,
  getHeaderFooterType,
  getBucketForPageNumber,
  getBucketRepresentative,
  buildMultiSectionIdentifier,
  getHeaderFooterTypeForSection,
  layoutHeaderFooterWithCache,
  computeDisplayPageNumber,
  findWordBoundaries,
  findParagraphBoundaries,
  createDragHandler,
  hitTestTableFragment,
} from '@superdoc/layout-bridge';
import type {
  HeaderFooterIdentifier,
  HeaderFooterLayoutResult,
  HeaderFooterType,
  PositionHit,
  MultiSectionHeaderFooterIdentifier,
  DropEvent,
  TableHitResult,
  PageHit,
} from '@superdoc/layout-bridge';
import { createDomPainter, DOM_CLASS_NAMES } from '@superdoc/painter-dom';
import type { LayoutMode, PageDecorationProvider, RulerOptions } from '@superdoc/painter-dom';
import { measureBlock } from '@superdoc/measuring-dom';
import type {
  ColumnLayout,
  FlowBlock,
  Layout,
  Measure,
  Page,
  SectionMetadata,
  Line,
  TrackedChangesMode,
  ParaFragment,
  Fragment,
  TableFragment,
  TableBlock,
  TableMeasure,
} from '@superdoc/contracts';
import { extractHeaderFooterSpace } from '@superdoc/contracts';
import { TrackChangesBasePluginKey } from '@extensions/track-changes/plugins/index.js';

// Comment and tracked change mark names (inline to avoid missing declaration files)
const CommentMarkName = 'commentMark';
const TrackInsertMarkName = 'trackInsert';
const TrackDeleteMarkName = 'trackDelete';
const TrackFormatMarkName = 'trackFormat';
// Collaboration cursor imports
import { absolutePositionToRelativePosition, relativePositionToAbsolutePosition, ySyncPluginKey } from 'y-prosemirror';
import * as Y from 'yjs';
import {
  HeaderFooterEditorManager,
  HeaderFooterLayoutAdapter,
  type HeaderFooterDescriptor,
} from './header-footer/HeaderFooterRegistry.js';
import { EditorOverlayManager } from './header-footer/EditorOverlayManager.js';
import { isInRegisteredSurface } from './uiSurfaceRegistry.js';

export type PageSize = {
  w: number;
  h: number;
};

export type PageMargins = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  header?: number;
  footer?: number;
};

export type VirtualizationOptions = {
  enabled?: boolean;
  window?: number;
  overscan?: number;
  gap?: number;
  paddingTop?: number;
};

/**
 * Awareness state structure from y-protocols.
 * Represents the state stored for each collaborator in the awareness protocol.
 */
type AwarenessState = {
  cursor?: {
    anchor: unknown;
    head: unknown;
  };
  user?: {
    name?: string;
    email?: string;
    color?: string;
  };
  [key: string]: unknown;
};

/**
 * Cursor position data stored in awareness state.
 * Contains relative Yjs positions for anchor and head.
 */
type AwarenessCursorData = {
  /** Relative Yjs position for selection anchor */
  anchor: Y.RelativePosition;
  /** Relative Yjs position for selection head (caret) */
  head: Y.RelativePosition;
};

/**
 * Extended awareness interface that includes the setLocalStateField method.
 * The base Awareness type from y-protocols has this method but it's not always
 * included in type definitions, so we extend it here for type safety.
 */
interface AwarenessWithSetField {
  clientID: number;
  getStates: () => Map<number, AwarenessState>;
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
  /**
   * Update a specific field in the local awareness state.
   * @param field - The field name to update (e.g., 'cursor', 'user')
   * @param value - The value to set for the field
   */
  setLocalStateField: (field: string, value: unknown) => void;
}

/**
 * User metadata for remote collaborators.
 * Exported as a standalone type for external consumers building custom presence UI.
 */
export type RemoteUserInfo = {
  /** User's display name (optional) */
  name?: string;
  /** User's email address (optional) */
  email?: string;
  /** Hex color code for this user's cursor/selection */
  color: string;
};

/**
 * Normalized remote cursor state for a single collaborator.
 * Contains absolute ProseMirror positions and user metadata.
 */
export type RemoteCursorState = {
  /** Yjs client ID for this collaborator */
  clientId: number;
  /** User metadata (name, email, color) */
  user: RemoteUserInfo;
  /** Selection anchor (absolute PM position) */
  anchor: number;
  /** Selection head/caret position (absolute PM position) */
  head: number;
  /** Timestamp of last update (for recency-based rendering limits) */
  updatedAt: number;
};

/**
 * Cell anchor state for table cell drag selection.
 *
 * Lifecycle:
 * - Created when a drag operation starts inside a table cell (#setCellAnchor)
 * - Persists throughout the drag to track the anchor cell
 * - Cleared when drag ends (#clearCellAnchor) or document changes
 *
 * Used by the cell selection state machine to determine when to transition
 * from text selection to cell selection mode during table drag operations.
 */
type CellAnchorState = {
  /** PM position of the table node */
  tablePos: number;
  /** PM position at the start of the anchor cell */
  cellPos: number;
  /** Row index of the anchor cell (0-based) */
  cellRowIndex: number;
  /** Column index of the anchor cell (0-based) */
  cellColIndex: number;
  /** Cached reference to table block ID for performance */
  tableBlockId: string;
};

/**
 * Configuration options for remote cursor presence rendering.
 * Controls how collaborator cursors and selections appear in the layout.
 */
export type PresenceOptions = {
  /** Enable remote cursor rendering. Default: true */
  enabled?: boolean;
  /** Show name labels above remote cursors. Default: true */
  showLabels?: boolean;
  /** Maximum number of remote cursors to render (performance guardrail). Default: 20 */
  maxVisible?: number;
  /** Custom formatter for user labels. Default: user.name ?? user.email */
  labelFormatter?: (user: RemoteUserInfo) => string;
  /** Opacity for remote selection highlights (0-1). Default: 0.35 */
  highlightOpacity?: number;
  /** Time in milliseconds before removing inactive cursors. Default: 300000 (5 minutes) */
  staleTimeout?: number;
};

/**
 * Type-safe interface for Editor instances with SuperConverter attached.
 * Used to access converter-specific properties for header/footer management
 * without resorting to type assertions throughout the codebase.
 */
interface EditorWithConverter extends Editor {
  converter?: {
    pageStyles?: { alternateHeaders?: boolean };
    headerIds?: { default?: string; first?: string; even?: string; odd?: string };
    footerIds?: { default?: string; first?: string; even?: string; odd?: string };
    createDefaultHeader?: (variant: string) => string;
    createDefaultFooter?: (variant: string) => string;
  };
}

export type LayoutEngineOptions = {
  pageSize?: PageSize;
  margins?: PageMargins;
  zoom?: number;
  virtualization?: VirtualizationOptions;
  pageStyles?: Record<string, unknown>;
  debugLabel?: string;
  layoutMode?: LayoutMode;
  trackedChanges?: TrackedChangesOverrides;
  /** Collaboration cursor/presence configuration */
  presence?: PresenceOptions;
  /**
   * Per-page ruler options.
   * When enabled, renders a horizontal ruler at the top of each page showing
   * inch marks and optionally margin handles for interactive margin adjustment.
   */
  ruler?: RulerOptions;
};

export type TrackedChangesOverrides = {
  mode?: TrackedChangesMode;
  enabled?: boolean;
};

export type PresentationEditorOptions = ConstructorParameters<typeof Editor>[0] & {
  /**
   * Host element where the layout-engine powered UI should render.
   */
  element: HTMLElement;
  /**
   * Layout-specific configuration consumed by PresentationEditor.
   */
  layoutEngineOptions?: LayoutEngineOptions;
  /**
   * Document mode for the editor. Determines editability and tracked changes behavior.
   * @default 'editing'
   */
  documentMode?: 'editing' | 'viewing' | 'suggesting';
  /**
   * Collaboration provider with awareness support (e.g., WebsocketProvider from y-websocket).
   * Required for remote cursor rendering.
   */
  collaborationProvider?: {
    awareness?: AwarenessWithSetField;
    disconnect?: () => void;
  } | null;
  /**
   * Whether to disable the context menu.
   * @default false
   */
  disableContextMenu?: boolean;
};

type LayoutState = {
  blocks: FlowBlock[];
  measures: Measure[];
  layout: Layout | null;
  bookmarks: Map<string, number>;
  anchorMap?: Map<string, number>;
};

type LayoutMetrics = {
  durationMs: number;
  blockCount: number;
  pageCount: number;
};

type LayoutError = {
  phase: 'initialization' | 'render';
  error: Error;
  timestamp: number;
};

type LayoutRect = { x: number; y: number; width: number; height: number; pageIndex: number };
type RangeRect = {
  pageIndex: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

type HeaderFooterMode = 'body' | 'header' | 'footer';
type HeaderFooterSession = {
  mode: HeaderFooterMode;
  kind?: 'header' | 'footer';
  headerId?: string | null;
  sectionType?: string | null;
  pageIndex?: number;
  pageNumber?: number;
};

type HeaderFooterRegion = {
  kind: 'header' | 'footer';
  headerId?: string;
  sectionType?: string;
  pageIndex: number;
  pageNumber: number;
  localX: number;
  localY: number;
  width: number;
  height: number;
};

type HeaderFooterLayoutContext = {
  layout: Layout;
  blocks: FlowBlock[];
  measures: Measure[];
  region: HeaderFooterRegion;
};

/**
 * Attributes for a field annotation node
 */
interface FieldAnnotationAttributes {
  fieldId: string;
  fieldType: string;
  displayLabel: string;
  type: string;
  fieldColor?: string;
}

/**
 * Information about the source field being dragged
 */
interface SourceFieldInfo {
  fieldId: string;
  fieldType: string;
  annotationType: string;
}

/**
 * Payload structure for field annotation drag-and-drop data
 */
interface FieldAnnotationDragPayload {
  /** Attributes to apply to the inserted field annotation */
  attributes?: FieldAnnotationAttributes;
  /** Source field information for tracking drop origin */
  sourceField?: SourceFieldInfo;
}

/**
 * Type guard to validate field annotation attributes
 * @param attrs - Unknown value to validate
 * @returns True if attrs is a valid FieldAnnotationAttributes object
 */
function isValidFieldAnnotationAttributes(attrs: unknown): attrs is FieldAnnotationAttributes {
  if (!attrs || typeof attrs !== 'object') return false;
  const a = attrs as Record<string, unknown>;
  return (
    typeof a.fieldId === 'string' &&
    typeof a.fieldType === 'string' &&
    typeof a.displayLabel === 'string' &&
    typeof a.type === 'string'
  );
}

const FIELD_ANNOTATION_DATA_TYPE = 'fieldAnnotation' as const;

const DEFAULT_PAGE_SIZE: PageSize = { w: 612, h: 792 }; // Letter @ 72dpi
const DEFAULT_MARGINS: PageMargins = { top: 72, right: 72, bottom: 72, left: 72 };
/** Default gap between pages when virtualization is enabled (matches renderer.ts virtualGap) */
const DEFAULT_VIRTUALIZED_PAGE_GAP = 72;
/** Default gap between pages without virtualization (from containerStyles in styles.ts) */
const DEFAULT_PAGE_GAP = 24;
const WORD_CHARACTER_REGEX = /[\p{L}\p{N}''_~-]/u;

// Constants for interaction timing and thresholds
/** Maximum time between clicks to register as multi-click (milliseconds) */
const MULTI_CLICK_TIME_THRESHOLD_MS = 400;
/** Maximum distance between clicks to register as multi-click (pixels) */
const MULTI_CLICK_DISTANCE_THRESHOLD_PX = 5;
/** Budget for header/footer initialization before warning (milliseconds) */
const HEADER_FOOTER_INIT_BUDGET_MS = 200;
/**
 * Debounce delay for scroll events (milliseconds).
 * Set to 32ms (~31fps) for responsive cursor updates during scrolling while avoiding
 * excessive re-renders. Reduced from 100ms to improve collaboration cursor responsiveness
 * when users scroll to view remote collaborators' positions.
 */
const SCROLL_DEBOUNCE_MS = 32;
/** Maximum zoom level before warning */
const MAX_ZOOM_WARNING_THRESHOLD = 10;
/** Maximum number of selection rectangles per user (performance guardrail) */
const MAX_SELECTION_RECTS_PER_USER = 100;
/** Default timeout for stale collaborator cleanup (milliseconds) */
const DEFAULT_STALE_TIMEOUT_MS = 5 * 60 * 1000;

const GLOBAL_PERFORMANCE: Performance | undefined = typeof performance !== 'undefined' ? performance : undefined;

/**
 * Telemetry payload for remote cursor render events.
 * Provides performance metrics for monitoring collaboration cursor rendering.
 */
export type RemoteCursorsRenderPayload = {
  /** Total number of collaborators with cursors */
  collaboratorCount: number;
  /** Number of cursors actually rendered (after maxVisible limit) */
  visibleCount: number;
  /** Time taken to render all cursors in milliseconds */
  renderTimeMs: number;
};

/**
 * Telemetry payload for layout updates.
 */
export type LayoutUpdatePayload = {
  layout: Layout;
  blocks: FlowBlock[];
  measures: Measure[];
  metrics: LayoutMetrics;
};

/**
 * Event payload emitted when an image is selected in the editor.
 */
export type ImageSelectedEvent = {
  /** The DOM element representing the selected image */
  element: HTMLElement;
  /** The layout-engine block ID for the image (null for inline images) */
  blockId: string | null;
  /** The ProseMirror document position where the image node starts */
  pmStart: number;
};

/**
 * Event payload emitted when an image is deselected in the editor.
 */
export type ImageDeselectedEvent = {
  /** The block ID of the previously selected image (may be a synthetic ID like "inline-{position}") */
  blockId: string;
};

/**
 * Discriminated union for all telemetry events.
 * Use TypeScript's type narrowing to handle each event type safely.
 */
export type TelemetryEvent =
  | { type: 'layout'; data: LayoutUpdatePayload }
  | { type: 'error'; data: LayoutError }
  | { type: 'remoteCursorsRender'; data: RemoteCursorsRenderPayload };

/**
 * PresentationEditor bootstraps the classic Editor instance in a hidden container
 * while layout-engine handles the visible rendering pipeline.
 */
export class PresentationEditor extends EventEmitter {
  // Static registry for managing instances globally
  static #instances = new Map<string, PresentationEditor>();

  /**
   * Fallback color palette for remote cursors when user.color is not provided.
   * Colors are deterministically assigned based on clientId to maintain consistency.
   * @private
   */
  static readonly FALLBACK_COLORS = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
  ];

  /**
   * Constants for remote cursor rendering styles.
   * Centralized styling values for consistent cursor/label rendering across all methods.
   * @private
   */
  static readonly CURSOR_STYLES = {
    CARET_WIDTH: 2,
    LABEL_FONT_SIZE: 13,
    LABEL_PADDING: '2px 6px',
    LABEL_OFFSET: '-1.05em',
    SELECTION_BORDER_RADIUS: '2px',
    MAX_LABEL_LENGTH: 30,
  } as const;

  /**
   * Get a PresentationEditor instance by document ID.
   */
  static getInstance(documentId: string): PresentationEditor | undefined {
    return PresentationEditor.#instances.get(documentId);
  }

  /**
   * Set zoom globally across all PresentationEditor instances.
   */
  static setGlobalZoom(zoom: number): void {
    PresentationEditor.#instances.forEach((instance) => {
      instance.setZoom(zoom);
    });
  }

  #options: PresentationEditorOptions;
  #editor: Editor;
  #visibleHost: HTMLElement;
  #viewportHost: HTMLElement;
  #painterHost: HTMLElement;
  #selectionOverlay: HTMLElement;
  #hiddenHost: HTMLElement;
  #layoutOptions: LayoutEngineOptions;
  #layoutState: LayoutState = { blocks: [], measures: [], layout: null, bookmarks: new Map() };
  #domPainter: ReturnType<typeof createDomPainter> | null = null;
  #dragHandlerCleanup: (() => void) | null = null;
  #layoutError: LayoutError | null = null;
  #layoutErrorState: 'healthy' | 'degraded' | 'failed' = 'healthy';
  #errorBanner: HTMLElement | null = null;
  #errorBannerMessage: HTMLElement | null = null;
  #telemetryEmitter: ((event: TelemetryEvent) => void) | null = null;
  #renderScheduled = false;
  #pendingDocChange = false;
  #isRerendering = false;
  #selectionUpdateScheduled = false;
  #remoteCursorUpdateScheduled = false;
  #rafHandle: number | null = null;
  #editorListeners: Array<{ event: string; handler: (...args: unknown[]) => void }> = [];
  #sectionMetadata: SectionMetadata[] = [];
  #documentMode: 'editing' | 'viewing' | 'suggesting' = 'editing';
  #inputBridge: PresentationInputBridge | null = null;
  #trackedChangesMode: TrackedChangesMode = 'review';
  #trackedChangesEnabled = true;
  #trackedChangesOverrides: TrackedChangesOverrides | undefined;
  #headerFooterManager: HeaderFooterEditorManager | null = null;
  #headerFooterAdapter: HeaderFooterLayoutAdapter | null = null;
  #headerFooterIdentifier: HeaderFooterIdentifier | null = null;
  #multiSectionIdentifier: MultiSectionHeaderFooterIdentifier | null = null;
  #headerLayoutResults: HeaderFooterLayoutResult[] | null = null;
  #footerLayoutResults: HeaderFooterLayoutResult[] | null = null;
  // Per-rId layout results for multi-section support
  #headerLayoutsByRId: Map<string, HeaderFooterLayoutResult> = new Map();
  #footerLayoutsByRId: Map<string, HeaderFooterLayoutResult> = new Map();
  #headerDecorationProvider: PageDecorationProvider | undefined;
  #footerDecorationProvider: PageDecorationProvider | undefined;
  #headerFooterManagerCleanups: Array<() => void> = [];
  #headerRegions: Map<number, HeaderFooterRegion> = new Map();
  #footerRegions: Map<number, HeaderFooterRegion> = new Map();
  #session: HeaderFooterSession = { mode: 'body' };
  #activeHeaderFooterEditor: Editor | null = null;
  #overlayManager: EditorOverlayManager | null = null;
  #hoverOverlay: HTMLElement | null = null;
  #hoverTooltip: HTMLElement | null = null;
  #modeBanner: HTMLElement | null = null;
  #ariaLiveRegion: HTMLElement | null = null;
  #hoverRegion: HeaderFooterRegion | null = null;
  #clickCount = 0;
  #lastClickTime = 0;
  #lastClickPosition: { x: number; y: number } = { x: 0, y: 0 };
  #lastSelectedImageBlockId: string | null = null;

  // Drag selection state
  #dragAnchor: number | null = null;
  #isDragging = false;
  #dragExtensionMode: 'char' | 'word' | 'para' = 'char';

  // Cell selection drag state
  // Tracks cell-specific context when drag starts in a table for multi-cell selection
  #cellAnchor: CellAnchorState | null = null;

  /** Cell drag mode state machine: 'none' = not in table, 'pending' = in table but haven't crossed cell boundary, 'active' = crossed cell boundary */
  #cellDragMode: 'none' | 'pending' | 'active' = 'none';

  // Remote cursor/presence state management
  /** Map of clientId -> normalized remote cursor state */
  #remoteCursorState: Map<number, RemoteCursorState> = new Map();
  /** Map of clientId -> DOM element for cursor (enables DOM reuse to prevent flicker) */
  #remoteCursorElements: Map<number, HTMLElement> = new Map();
  /** Flag indicating remote cursor state needs re-rendering (RAF batching) */
  #remoteCursorDirty = false;
  /** DOM element for rendering remote cursor overlays */
  #remoteCursorOverlay: HTMLElement | null = null;
  /** DOM element for rendering local selection/caret (dual-layer overlay architecture) */
  #localSelectionLayer: HTMLElement | null = null;
  /** Cleanup function for awareness subscription */
  #awarenessCleanup: (() => void) | null = null;
  /** Cleanup function for scroll listener (virtualization updates) */
  #scrollCleanup: (() => void) | null = null;
  /** Timeout handle for scroll debounce (instance-level tracking for proper cleanup) */
  #scrollTimeout: number | undefined = undefined;
  /** Timestamp of last remote cursor render for throttle-based immediate rendering */
  #lastRemoteCursorRenderTime = 0;
  /** Timeout handle for trailing edge of cursor throttle */
  #remoteCursorThrottleTimeout: number | null = null;

  constructor(options: PresentationEditorOptions) {
    super();

    if (!options?.element) {
      throw new Error('PresentationEditor requires an `element` to mount into.');
    }

    this.#options = options;
    this.#documentMode = options.documentMode ?? 'editing';
    this.#visibleHost = options.element;
    this.#visibleHost.innerHTML = '';
    this.#visibleHost.classList.add('presentation-editor');
    if (!this.#visibleHost.hasAttribute('tabindex')) {
      this.#visibleHost.tabIndex = 0;
    }
    const viewForPosition = this.#visibleHost.ownerDocument?.defaultView ?? window;
    if (viewForPosition.getComputedStyle(this.#visibleHost).position === 'static') {
      this.#visibleHost.style.position = 'relative';
    }
    const doc = this.#visibleHost.ownerDocument ?? document;

    // Validate and normalize presence options
    const rawPresence = options.layoutEngineOptions?.presence;
    const validatedPresence = rawPresence
      ? {
          ...rawPresence,
          // Clamp maxVisible to reasonable range [1, 100]
          maxVisible:
            rawPresence.maxVisible !== undefined
              ? Math.max(1, Math.min(rawPresence.maxVisible, 100))
              : rawPresence.maxVisible,
          // Clamp highlightOpacity to [0, 1]
          highlightOpacity:
            rawPresence.highlightOpacity !== undefined
              ? Math.max(0, Math.min(rawPresence.highlightOpacity, 1))
              : rawPresence.highlightOpacity,
        }
      : undefined;

    this.#layoutOptions = {
      pageSize: options.layoutEngineOptions?.pageSize ?? DEFAULT_PAGE_SIZE,
      margins: options.layoutEngineOptions?.margins ?? DEFAULT_MARGINS,
      virtualization: options.layoutEngineOptions?.virtualization,
      zoom: options.layoutEngineOptions?.zoom ?? 1,
      pageStyles: options.layoutEngineOptions?.pageStyles,
      debugLabel: options.layoutEngineOptions?.debugLabel,
      layoutMode: options.layoutEngineOptions?.layoutMode ?? 'vertical',
      trackedChanges: options.layoutEngineOptions?.trackedChanges,
      presence: validatedPresence,
    };
    this.#trackedChangesOverrides = options.layoutEngineOptions?.trackedChanges;

    this.#viewportHost = doc.createElement('div');
    this.#viewportHost.className = 'presentation-editor__viewport';
    // Hide the viewport from screen readers - it's a visual rendering layer, not semantic content.
    // The hidden ProseMirror editor (in #hiddenHost) provides the actual accessible document structure.
    // This prevents screen readers from encountering duplicate or non-semantic visual elements.
    this.#viewportHost.setAttribute('aria-hidden', 'true');
    this.#viewportHost.style.position = 'relative';
    this.#viewportHost.style.width = '100%';
    // Set min-height to at least one page so the viewport is clickable before layout renders
    const pageHeight = this.#layoutOptions.pageSize?.h ?? DEFAULT_PAGE_SIZE.h;
    this.#viewportHost.style.minHeight = `${pageHeight}px`;
    this.#visibleHost.appendChild(this.#viewportHost);

    this.#painterHost = doc.createElement('div');
    this.#painterHost.className = 'presentation-editor__pages';
    this.#painterHost.style.transformOrigin = 'top left';
    this.#viewportHost.appendChild(this.#painterHost);

    // Create dual-layer overlay structure
    // Container holds both remote (below) and local (above) layers
    this.#selectionOverlay = doc.createElement('div');
    this.#selectionOverlay.className = 'presentation-editor__selection-overlay';
    this.#selectionOverlay.id = `presentation-overlay-${options.documentId || 'default'}`;
    this.#selectionOverlay.style.position = 'absolute';
    this.#selectionOverlay.style.inset = '0';
    this.#selectionOverlay.style.pointerEvents = 'none';
    this.#selectionOverlay.style.zIndex = '10';

    // Create remote layer (renders below local)
    this.#remoteCursorOverlay = doc.createElement('div');
    this.#remoteCursorOverlay.className = 'presentation-editor__selection-layer--remote';
    this.#remoteCursorOverlay.style.position = 'absolute';
    this.#remoteCursorOverlay.style.inset = '0';
    this.#remoteCursorOverlay.style.pointerEvents = 'none';

    // Create local layer (renders above remote)
    this.#localSelectionLayer = doc.createElement('div');
    this.#localSelectionLayer.className = 'presentation-editor__selection-layer--local';
    this.#localSelectionLayer.style.position = 'absolute';
    this.#localSelectionLayer.style.inset = '0';
    this.#localSelectionLayer.style.pointerEvents = 'none';

    // Append layers in correct z-index order (remote first, local second)
    this.#selectionOverlay.appendChild(this.#remoteCursorOverlay);
    this.#selectionOverlay.appendChild(this.#localSelectionLayer);
    this.#viewportHost.appendChild(this.#selectionOverlay);
    this.#hoverOverlay = doc.createElement('div');
    this.#hoverOverlay.className = 'presentation-editor__hover-overlay';
    Object.assign(this.#hoverOverlay.style, {
      position: 'absolute',
      border: '1px dashed rgba(51, 102, 255, 0.8)',
      borderRadius: '2px',
      pointerEvents: 'none',
      display: 'none',
      zIndex: '11',
    });
    this.#selectionOverlay.appendChild(this.#hoverOverlay);

    this.#hoverTooltip = doc.createElement('div');
    this.#hoverTooltip.className = 'presentation-editor__hover-tooltip';
    Object.assign(this.#hoverTooltip.style, {
      position: 'absolute',
      background: 'rgba(18, 22, 33, 0.85)',
      color: '#fff',
      padding: '2px 6px',
      fontSize: '12px',
      borderRadius: '2px',
      pointerEvents: 'none',
      display: 'none',
      zIndex: '12',
      whiteSpace: 'nowrap',
    });
    this.#selectionOverlay.appendChild(this.#hoverTooltip);

    this.#modeBanner = doc.createElement('div');
    this.#modeBanner.className = 'presentation-editor__mode-banner';
    Object.assign(this.#modeBanner.style, {
      position: 'absolute',
      top: '0',
      left: '50%',
      transform: 'translate(-50%, -100%)',
      background: '#1b3fbf',
      color: '#fff',
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      display: 'none',
      zIndex: '15',
    });
    this.#visibleHost.appendChild(this.#modeBanner);

    this.#ariaLiveRegion = doc.createElement('div');
    this.#ariaLiveRegion.className = 'presentation-editor__aria-live';
    this.#ariaLiveRegion.setAttribute('role', 'status');
    this.#ariaLiveRegion.setAttribute('aria-live', 'polite');
    Object.assign(this.#ariaLiveRegion.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clip: 'rect(1px, 1px, 1px, 1px)',
    });
    this.#visibleHost.appendChild(this.#ariaLiveRegion);

    this.#hiddenHost = this.#createHiddenHost(doc);
    if (doc.body) {
      doc.body.appendChild(this.#hiddenHost);
    } else {
      this.#visibleHost.appendChild(this.#hiddenHost);
    }

    const { layoutEngineOptions: _layoutEngineOptions, element: _element, ...editorOptions } = options;
    const normalizedEditorProps = {
      ...(editorOptions.editorProps ?? {}),
      editable: () => {
        // Hidden editor respects documentMode for plugin compatibility
        // but remains visually/interactively inert (handled by hidden container CSS)
        return this.#documentMode !== 'viewing';
      },
    };
    try {
      this.#editor = new Editor({
        ...(editorOptions as ConstructorParameters<typeof Editor>[0]),
        element: this.#hiddenHost,
        editorProps: normalizedEditorProps,
        documentMode: this.#documentMode,
      });
      // Set bidirectional reference for renderer-neutral helpers
      // Type assertion is safe here as we control both Editor and PresentationEditor
      (this.#editor as Editor & { presentationEditor?: PresentationEditor | null }).presentationEditor = this;
      // Add reference back to PresentationEditor for event handler detection
      (this.#editor as Editor & { _presentationEditor?: PresentationEditor })._presentationEditor = this;
      if (typeof this.#options.disableContextMenu === 'boolean') {
        this.setContextMenuDisabled(this.#options.disableContextMenu);
      }

      this.#initHeaderFooterRegistry();
      this.#applyZoom();
      this.#setupEditorListeners();
      this.#setupPointerHandlers();
      this.#setupDragHandlers();
      this.#setupInputBridge();
      this.#syncTrackedChangesPreferences();

      // Register this instance in the static registry
      if (options.documentId) {
        PresentationEditor.#instances.set(options.documentId, this);
      }

      this.#pendingDocChange = true;
      this.#scheduleRerender();

      // Check if collaboration is already ready and setup cursors immediately
      // Handles race condition where collaborationReady fires before event listener is attached
      if (this.#options.collaborationProvider?.awareness) {
        const ystate = ySyncPluginKey.getState(this.#editor.state);
        if (ystate && this.#layoutOptions.presence?.enabled !== false) {
          this.#setupCollaborationCursors();
        }
      }
    } catch (error) {
      // Ensure cleanup on initialization failure
      this.destroy();
      throw error;
    }
  }

  /**
   * Accessor for the underlying Editor so SuperDoc can reuse existing APIs.
   */
  get editor(): Editor {
    return this.#editor;
  }

  /**
   * Expose the visible host element for renderer-agnostic consumers.
   */
  get element(): HTMLElement {
    return this.#visibleHost;
  }

  /**
   * Get the commands interface for the currently active editor (header/footer-aware).
   *
   * This property dynamically routes command execution to the appropriate editor instance:
   * - In body mode, returns the main editor's commands
   * - In header/footer mode, returns the active header/footer editor's commands
   *
   * This ensures that formatting commands (bold, italic, etc.) and other operations
   * execute in the correct editing context.
   *
   * @returns The CommandService instance for the active editor
   *
   * @example
   * ```typescript
   * // This will bold text in the active editor (body or header/footer)
   * presentationEditor.commands.bold();
   * ```
   */
  get commands() {
    const activeEditor = this.getActiveEditor();
    return activeEditor.commands;
  }

  /**
   * Get the ProseMirror editor state for the currently active editor (header/footer-aware).
   *
   * This property dynamically returns the state from the appropriate editor instance:
   * - In body mode, returns the main editor's state
   * - In header/footer mode, returns the active header/footer editor's state
   *
   * This enables components like SlashMenu and context menus to access document
   * state, selection, and schema information in the correct editing context.
   *
   * @returns The EditorState for the active editor
   *
   * @example
   * ```typescript
   * const { selection, doc } = presentationEditor.state;
   * const selectedText = doc.textBetween(selection.from, selection.to);
   * ```
   */
  get state(): EditorState {
    return this.getActiveEditor().state;
  }

  /**
   * Check if the editor is currently editable (header/footer-aware).
   *
   * This property checks the editable state of the currently active editor:
   * - In body mode, returns whether the main editor is editable
   * - In header/footer mode, returns whether the header/footer editor is editable
   *
   * The editor may be non-editable due to:
   * - Document mode set to 'viewing'
   * - Explicit `editable: false` option
   * - Editor not fully initialized
   *
   * @returns true if the active editor accepts input, false otherwise
   *
   * @example
   * ```typescript
   * if (presentationEditor.isEditable) {
   *   presentationEditor.commands.insertText('Hello');
   * }
   * ```
   */
  get isEditable(): boolean {
    return this.getActiveEditor().isEditable;
  }

  /**
   * Get the editor options for the currently active editor (header/footer-aware).
   *
   * This property returns the options object from the appropriate editor instance,
   * providing access to configuration like document mode, AI settings, and custom
   * slash menu configuration.
   *
   * @returns The options object for the active editor
   *
   * @example
   * ```typescript
   * const { documentMode, isAiEnabled } = presentationEditor.options;
   * ```
   */
  get options() {
    return this.getActiveEditor().options;
  }

  /**
   * Dispatch a ProseMirror transaction to the currently active editor (header/footer-aware).
   *
   * This method routes transactions to the appropriate editor instance:
   * - In body mode, dispatches to the main editor
   * - In header/footer mode, dispatches to the active header/footer editor
   *
   * Use this for direct state manipulation when commands are insufficient.
   * For most use cases, prefer using `commands` or `dispatchInActiveEditor`.
   *
   * @param tr - The ProseMirror transaction to dispatch
   *
   * @example
   * ```typescript
   * const { state } = presentationEditor;
   * const tr = state.tr.insertText('Hello', state.selection.from);
   * presentationEditor.dispatch(tr);
   * ```
   */
  dispatch(tr: Transaction): void {
    const activeEditor = this.getActiveEditor();
    activeEditor.view?.dispatch(tr);
  }

  /**
   * Focus the editor, routing focus to the appropriate editing surface.
   *
   * In PresentationEditor, the actual ProseMirror EditorView is hidden and input
   * is bridged from the visible layout surface. This method focuses the hidden
   * editor view to enable keyboard input while the visual focus remains on the
   * rendered presentation.
   *
   * @example
   * ```typescript
   * // After closing a modal, restore focus to the editor
   * presentationEditor.focus();
   * ```
   */
  focus(): void {
    const activeEditor = this.getActiveEditor();
    activeEditor.view?.focus();
  }

  /**
   * Returns the currently active editor (body or header/footer session).
   *
   * When editing headers or footers, this returns the header/footer editor instance.
   * Otherwise, returns the main document body editor.
   *
   * @returns The active Editor instance
   *
   * @example
   * ```typescript
   * const editor = presentation.getActiveEditor();
   * const selection = editor.state.selection;
   * ```
   */
  getActiveEditor(): Editor {
    if (this.#session.mode === 'body' || !this.#activeHeaderFooterEditor) {
      return this.#editor;
    }
    return this.#activeHeaderFooterEditor;
  }

  /**
   * Undo the last action in the active editor.
   */
  undo(): boolean {
    const editor = this.getActiveEditor();
    if (editor?.commands?.undo) {
      return Boolean(editor.commands.undo());
    }
    return false;
  }

  /**
   * Redo the last undone action in the active editor.
   */
  redo(): boolean {
    const editor = this.getActiveEditor();
    if (editor?.commands?.redo) {
      return Boolean(editor.commands.redo());
    }
    return false;
  }

  /**
   * Runs a callback against the active editor (body or header/footer session).
   *
   * Use this method when you need to run commands or access state in the currently
   * active editing context (which may be the body or a header/footer region).
   *
   * @param callback - Function that receives the active editor instance
   *
   * @example
   * ```typescript
   * presentation.dispatchInActiveEditor((editor) => {
   *   editor.commands.insertText('Hello world');
   * });
   * ```
   */
  dispatchInActiveEditor(callback: (editor: Editor) => void) {
    const editor = this.getActiveEditor();
    callback(editor);
  }

  /**
   * Alias for the visible host container so callers can attach listeners explicitly.
   *
   * This is the main scrollable container that hosts the rendered pages.
   * Use this element to attach scroll listeners, measure viewport bounds, or
   * position floating UI elements relative to the editor.
   *
   * @returns The visible host HTMLElement
   *
   * @example
   * ```typescript
   * const host = presentation.visibleHost;
   * host.addEventListener('scroll', () => console.log('Scrolled!'));
   * ```
   */
  get visibleHost(): HTMLElement {
    return this.#visibleHost;
  }

  /**
   * Selection overlay element used for caret + highlight rendering.
   *
   * This overlay is positioned absolutely over the rendered pages and contains
   * the visual selection indicators (caret, selection highlights, remote cursors).
   *
   * @returns The selection overlay element, or null if not yet initialized
   *
   * @example
   * ```typescript
   * const overlay = presentation.overlayElement;
   * if (overlay) {
   *   console.log('Overlay dimensions:', overlay.getBoundingClientRect());
   * }
   * ```
   */
  get overlayElement(): HTMLElement | null {
    return this.#selectionOverlay ?? null;
  }

  /**
   * Get the current zoom level.
   *
   * The zoom level is a multiplier that controls the visual scale of the document.
   * This value is applied via CSS transform: scale() on the #viewportHost element,
   * which ensures consistent scaling between rendered content and overlay elements
   * (selections, cursors, interactive handles).
   *
   * Relationship to Centralized Zoom Architecture:
   * - PresentationEditor is the SINGLE SOURCE OF TRUTH for zoom state
   * - Zoom is applied internally via transform: scale() on #viewportHost
   * - External components (toolbar, UI controls) should use setZoom() to modify zoom
   * - The zoom value is used throughout the system for coordinate transformations
   *
   * Coordinate Space Implications:
   * - Layout coordinates: Unscaled logical pixels used by the layout engine
   * - Screen coordinates: Physical pixels affected by CSS transform: scale()
   * - Conversion: screenCoord = layoutCoord * zoom
   *
   * Zoom Scale:
   * - 1 = 100% (default, no scaling)
   * - 0.5 = 50% (zoomed out, content appears smaller)
   * - 2 = 200% (zoomed in, content appears larger)
   *
   * @returns The current zoom level multiplier (default: 1 if not configured)
   *
   * @example
   * ```typescript
   * const zoom = presentation.zoom;
   * // Convert layout coordinates to screen coordinates
   * const screenX = layoutX * zoom;
   * const screenY = layoutY * zoom;
   *
   * // Convert screen coordinates back to layout coordinates
   * const layoutX = screenX / zoom;
   * const layoutY = screenY / zoom;
   * ```
   */
  get zoom(): number {
    return this.#layoutOptions.zoom ?? 1;
  }

  /**
   * Set the document mode and update editor editability.
   *
   * This method updates both the PresentationEditor's internal mode state and the
   * underlying Editor's document mode. The hidden editor's editable state will
   * reflect the mode for plugin compatibility (editable in 'editing' and 'suggesting'
   * modes, non-editable in 'viewing' mode), while the presentation layer remains
   * visually inert (handled by hidden container CSS).
   *
   * @param mode - The document mode to set. Valid values:
   *   - 'editing': Full editing capabilities, no tracked changes
   *   - 'suggesting': Editing with tracked changes enabled
   *   - 'viewing': Read-only mode, shows original content without changes
   * @throws {TypeError} If mode is not a string or is not one of the valid modes
   *
   * @example
   * ```typescript
   * const presentation = PresentationEditor.getInstance('doc-123');
   * presentation.setDocumentMode('viewing'); // Switch to read-only
   * ```
   */
  setDocumentMode(mode: 'editing' | 'viewing' | 'suggesting') {
    if (typeof mode !== 'string') {
      throw new TypeError(`[PresentationEditor] setDocumentMode expects a string, received ${typeof mode}`);
    }
    const validModes: Array<'editing' | 'viewing' | 'suggesting'> = ['editing', 'viewing', 'suggesting'];
    if (!validModes.includes(mode)) {
      throw new TypeError(`[PresentationEditor] Invalid mode "${mode}". Must be one of: ${validModes.join(', ')}`);
    }
    this.#documentMode = mode;
    this.#editor.setDocumentMode(mode);
    const trackedChangesChanged = this.#syncTrackedChangesPreferences();
    if (trackedChangesChanged) {
      this.#pendingDocChange = true;
      this.#scheduleRerender();
    }
  }

  /**
   * Override tracked-changes rendering preferences—for hosts without plugin state
   * or when forcing a specific viewing mode (e.g., PDF preview).
   *
   * @param overrides - Tracked changes overrides object with optional 'mode' and 'enabled' fields
   * @throws {TypeError} If overrides is provided but is not a plain object
   */
  setTrackedChangesOverrides(overrides?: TrackedChangesOverrides) {
    if (overrides !== undefined && (typeof overrides !== 'object' || overrides === null || Array.isArray(overrides))) {
      throw new TypeError('[PresentationEditor] setTrackedChangesOverrides expects an object or undefined');
    }
    if (overrides !== undefined) {
      if (overrides.mode !== undefined && !['review', 'simple', 'original'].includes(overrides.mode as string)) {
        throw new TypeError(
          `[PresentationEditor] Invalid tracked changes mode "${overrides.mode}". Must be one of: review, simple, original`,
        );
      }
      if (overrides.enabled !== undefined && typeof overrides.enabled !== 'boolean') {
        throw new TypeError('[PresentationEditor] tracked changes "enabled" must be a boolean');
      }
    }
    this.#trackedChangesOverrides = overrides;
    this.#layoutOptions.trackedChanges = overrides;
    const trackedChangesChanged = this.#syncTrackedChangesPreferences();
    if (trackedChangesChanged) {
      this.#pendingDocChange = true;
      this.#scheduleRerender();
    }
  }

  /**
   * Toggle the custom context menu at runtime to respect host-level guardrails.
   */
  setContextMenuDisabled(disabled: boolean) {
    this.#editor.setOptions({ disableContextMenu: Boolean(disabled) });
  }

  /**
   * Subscribe to layout update events. Returns an unsubscribe function.
   */
  onLayoutUpdated(handler: (payload: LayoutState & { layout: Layout; metrics?: LayoutMetrics }) => void) {
    this.on('layoutUpdated', handler);
    return () => this.off('layoutUpdated', handler);
  }

  /**
   * Subscribe to layout error events. Returns an unsubscribe function.
   */
  onLayoutError(handler: (error: LayoutError) => void) {
    this.on('layoutError', handler);
    return () => this.off('layoutError', handler);
  }

  /**
   * Attach a telemetry listener to capture layout events/errors.
   * Uses type-safe discriminated union for event handling.
   *
   * @param handler - Callback function receiving telemetry events
   * @returns Unsubscribe function to remove the handler
   *
   * @example
   * ```typescript
   * const unsubscribe = editor.onTelemetry((event) => {
   *   if (event.type === 'remoteCursorsRender') {
   *     console.log(`Rendered ${event.data.visibleCount} cursors in ${event.data.renderTimeMs}ms`);
   *   }
   * });
   * ```
   */
  onTelemetry(handler: (event: TelemetryEvent) => void) {
    this.#telemetryEmitter = handler;
    return () => {
      if (this.#telemetryEmitter === handler) {
        this.#telemetryEmitter = null;
      }
    };
  }

  /**
   * Surface pages for pagination UI consumers.
   */
  getPages() {
    return this.#layoutState.layout?.pages ?? [];
  }

  /**
   * Surface the most recent layout error (if any).
   */
  getLayoutError(): LayoutError | null {
    return this.#layoutError;
  }

  /**
   * Returns the current health status of the layout engine.
   *
   * @returns Layout health status:
   *   - 'healthy': No errors, layout is functioning normally
   *   - 'degraded': Recovered from errors but may have stale state
   *   - 'failed': Critical error, layout cannot render
   *
   * @example
   * ```typescript
   * const editor = PresentationEditor.getInstance('doc-123');
   * if (!editor.isLayoutHealthy()) {
   *   console.error('Layout is unhealthy:', editor.getLayoutError());
   * }
   * ```
   */
  isLayoutHealthy(): boolean {
    return this.#layoutErrorState === 'healthy';
  }

  /**
   * Returns the detailed layout health state.
   *
   * @returns One of: 'healthy', 'degraded', 'failed'
   */
  getLayoutHealthState(): 'healthy' | 'degraded' | 'failed' {
    return this.#layoutErrorState;
  }

  /**
   * Return layout-relative rects for the current document selection.
   */
  getSelectionRects(relativeTo?: HTMLElement): RangeRect[] {
    const selection = this.#editor.state?.selection;
    if (!selection || selection.empty) return [];
    return this.getRangeRects(selection.from, selection.to, relativeTo);
  }

  /**
   * Convert an arbitrary document range into layout-based bounding rects.
   *
   * @param from - Start position in the ProseMirror document
   * @param to - End position in the ProseMirror document
   * @param relativeTo - Optional HTMLElement for coordinate reference. If provided, returns coordinates
   *                     relative to this element's bounding rect. If omitted, returns absolute viewport
   *                     coordinates relative to the selection overlay.
   * @returns Array of rects, each containing pageIndex and position data (left, top, right, bottom, width, height)
   */
  getRangeRects(from: number, to: number, relativeTo?: HTMLElement): RangeRect[] {
    if (!this.#selectionOverlay) return [];
    if (!Number.isFinite(from) || !Number.isFinite(to)) return [];

    const start = Math.min(from, to);
    const end = Math.max(from, to);
    // Use effective zoom from actual rendered dimensions, not internal state.
    // Zoom may be applied externally (e.g., by SuperDoc toolbar) without
    // updating PresentationEditor's internal zoom value.
    const zoom = this.#layoutOptions.zoom ?? 1;
    const relativeRect = relativeTo?.getBoundingClientRect() ?? null;
    const containerRect = this.#visibleHost.getBoundingClientRect();
    const scrollLeft = this.#visibleHost.scrollLeft ?? 0;
    const scrollTop = this.#visibleHost.scrollTop ?? 0;

    const layoutRectSource = () => {
      if (this.#session.mode !== 'body') {
        return this.#computeHeaderFooterSelectionRects(start, end);
      }
      if (!this.#layoutState.layout) return [];
      const rects =
        selectionToRects(this.#layoutState.layout, this.#layoutState.blocks, this.#layoutState.measures, start, end) ??
        [];
      return rects;
    };

    const rawRects = layoutRectSource();
    if (!rawRects.length) return [];

    // If we can get a DOM-based caret for the range start, compute a per-page delta to align highlights with painter DOM.
    let domCaretStart: { pageIndex: number; x: number; y: number } | null = null;
    let domCaretEnd: { pageIndex: number; x: number; y: number } | null = null;
    try {
      domCaretStart = this.#computeDomCaretPageLocal(start);
      domCaretEnd = this.#computeDomCaretPageLocal(end);
    } catch (error) {
      // DOM operations can throw exceptions - fall back to geometry-only positioning
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PresentationEditor] DOM caret computation failed in getRectsForRange:', error);
      }
    }
    const layoutCaretStart = this.#computeCaretLayoutRectGeometry(start, false);
    const layoutCaretEnd = this.#computeCaretLayoutRectGeometry(end, false);
    const pageDelta: Record<number, { dx: number; dy: number }> = {};
    if (domCaretStart && layoutCaretStart && domCaretStart.pageIndex === layoutCaretStart.pageIndex) {
      pageDelta[domCaretStart.pageIndex] = {
        dx: domCaretStart.x - layoutCaretStart.x,
        dy: domCaretStart.y - layoutCaretStart.y,
      };
    }

    // Fix Issue #1: Get actual header/footer page height instead of hardcoded 1
    // When in header/footer mode, we need to use the real page height from the layout context
    // to correctly map coordinates for selection highlighting
    const pageHeight = this.#session.mode === 'body' ? this.#getBodyPageHeight() : this.#getHeaderFooterPageHeight();
    const pageGap = this.#layoutState.layout?.pageGap ?? 0;
    const finalRects = rawRects
      .map((rect: LayoutRect, idx: number, allRects: LayoutRect[]) => {
        const delta = pageDelta[rect.pageIndex];
        let adjustedX = delta ? rect.x + delta.dx : rect.x;
        const adjustedY = delta ? rect.y + delta.dy : rect.y;

        // If we have DOM caret positions, override start/end rect edges for tighter alignment
        const isFirstRect = idx === 0;
        const isLastRect = idx === allRects.length - 1;
        if (isFirstRect && domCaretStart && rect.pageIndex === domCaretStart.pageIndex) {
          adjustedX = domCaretStart.x;
        }
        if (isLastRect && domCaretEnd && rect.pageIndex === domCaretEnd.pageIndex) {
          const endX = domCaretEnd.x;
          const newWidth = Math.max(1, endX - adjustedX);
          // Temporarily stash width override by updating rect.width for downstream calculations
          rect = { ...rect, width: newWidth };
        }

        const pageLocalY = adjustedY - rect.pageIndex * (pageHeight + pageGap);
        const coords = this.#convertPageLocalToOverlayCoords(rect.pageIndex, adjustedX, pageLocalY);
        if (!coords) return null;
        // coords are in layout space; convert to viewport coordinates using scroll + zoom
        const absLeft = coords.x * zoom - scrollLeft + containerRect.left;
        const absTop = coords.y * zoom - scrollTop + containerRect.top;
        const left = relativeRect ? absLeft - relativeRect.left : absLeft;
        const top = relativeRect ? absTop - relativeRect.top : absTop;
        const width = Math.max(1, rect.width * zoom);
        const height = Math.max(1, rect.height * zoom);
        return {
          pageIndex: rect.pageIndex,
          left,
          top,
          right: left + width,
          bottom: top + height,
          width,
          height,
        };
      })
      .filter((rect: RangeRect | null): rect is RangeRect => Boolean(rect));

    return finalRects;
  }

  /**
   * Get selection bounds for a document range with aggregated bounding box.
   * Returns null if layout is unavailable or the range is invalid.
   *
   * @param from - Start position in the ProseMirror document
   * @param to - End position in the ProseMirror document
   * @param relativeTo - Optional HTMLElement to use as coordinate reference. If provided, returns coordinates
   *                     relative to this element's bounding rect (client coordinates). If omitted, returns
   *                     absolute viewport coordinates (relative to the selection overlay).
   * @returns Object containing aggregated bounds, individual rects, and pageIndex, or null if unavailable
   */
  getSelectionBounds(
    from: number,
    to: number,
    relativeTo?: HTMLElement,
  ): {
    bounds: { top: number; left: number; bottom: number; right: number; width: number; height: number };
    rects: RangeRect[];
    pageIndex: number;
  } | null {
    if (!this.#layoutState.layout) return null;
    const rects = this.getRangeRects(from, to, relativeTo);
    if (!rects.length) return null;
    const bounds = this.#aggregateLayoutBounds(rects);
    if (!bounds) return null;
    return {
      rects,
      bounds,
      pageIndex: rects[0]?.pageIndex ?? 0,
    };
  }

  /**
   * Remap comment positions to layout coordinates with bounds and rects.
   * Takes a positions object with threadIds as keys and position data as values.
   * Returns the same structure with added bounds, rects, and pageIndex for each comment.
   *
   * PERFORMANCE NOTE: This iterates all comment positions on every call. For documents with many comments
   * (>100), consider caching layout bounds per comment and invalidating on layout updates.
   *
   * @param positions - Map of threadId -> { start?, end?, pos?, ...otherFields }
   * @param relativeTo - Optional HTMLElement for coordinate reference
   * @returns Updated positions map with bounds, rects, and pageIndex added to each comment
   */
  getCommentBounds(
    positions: Record<string, { start?: number; end?: number; pos?: number; [key: string]: unknown }>,
    relativeTo?: HTMLElement,
  ): Record<
    string,
    {
      start?: number;
      end?: number;
      pos?: number;
      bounds?: unknown;
      rects?: unknown;
      pageIndex?: number;
      [key: string]: unknown;
    }
  > {
    if (!positions || typeof positions !== 'object') return positions;
    if (!this.#layoutState.layout) return positions;

    const entries = Object.entries(positions);
    if (!entries.length) return positions;

    let hasUpdates = false;
    const remapped: Record<
      string,
      {
        start?: number;
        end?: number;
        pos?: number;
        bounds?: unknown;
        rects?: unknown;
        pageIndex?: number;
        [key: string]: unknown;
      }
    > = {};

    entries.forEach(([threadId, data]) => {
      if (!data) {
        remapped[threadId] = data;
        return;
      }
      const start = data.start ?? data.pos;
      const end = data.end ?? start;
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        remapped[threadId] = data;
        return;
      }

      const layoutRange = this.getSelectionBounds(start!, end!, relativeTo);
      if (!layoutRange) {
        remapped[threadId] = data;
        return;
      }

      hasUpdates = true;
      remapped[threadId] = {
        ...data,
        bounds: layoutRange.bounds,
        rects: layoutRange.rects,
        pageIndex: layoutRange.pageIndex,
      };
    });

    return hasUpdates ? remapped : positions;
  }

  /**
   * Collect all comment and tracked change positions from the PM document.
   *
   * This is the authoritative source for PM positions - called after every
   * layout update to ensure positions are always fresh from the current document.
   *
   * The returned positions contain PM offsets (start, end) which can be passed
   * to getCommentBounds() to compute visual layout coordinates.
   *
   * @returns Map of threadId -> { threadId, start, end }
   */
  #collectCommentPositions(): Record<string, { threadId: string; start: number; end: number }> {
    const editorState = this.#editor?.state;
    if (!editorState) return {};

    const doc = editorState.doc;
    const trackChangeMarks = [TrackInsertMarkName, TrackDeleteMarkName, TrackFormatMarkName];

    // Collect PM positions for all comments and tracked changes
    const pmPositions: Record<string, { threadId: string; start: number; end: number }> = {};

    doc.descendants((node, pos) => {
      const marks = node.marks || [];

      for (const mark of marks) {
        let threadId: string | undefined;

        if (mark.type.name === CommentMarkName) {
          threadId = mark.attrs.commentId || mark.attrs.importedId;
        } else if (trackChangeMarks.includes(mark.type.name)) {
          threadId = mark.attrs.id;
        }

        if (!threadId) continue;

        const nodeEnd = pos + node.nodeSize;

        if (!pmPositions[threadId]) {
          pmPositions[threadId] = { threadId, start: pos, end: nodeEnd };
        } else {
          // Extend range if this mark spans multiple nodes
          pmPositions[threadId].start = Math.min(pmPositions[threadId].start, pos);
          pmPositions[threadId].end = Math.max(pmPositions[threadId].end, nodeEnd);
        }
      }
    });

    return pmPositions;
  }

  /**
   * Return a snapshot of the latest layout state.
   */
  getLayoutSnapshot(): {
    layout: Layout | null;
    blocks: FlowBlock[];
    measures: Measure[];
    sectionMetadata: SectionMetadata[];
  } {
    return {
      layout: this.#layoutState.layout,
      blocks: this.#layoutState.blocks,
      measures: this.#layoutState.measures,
      sectionMetadata: this.#sectionMetadata,
    };
  }

  /**
   * Expose the current layout engine options.
   */
  getLayoutOptions(): LayoutEngineOptions {
    return { ...this.#layoutOptions };
  }

  /**
   * Get the page styles for the section containing the current caret position.
   *
   * In multi-section documents, different sections can have different page sizes,
   * margins, and orientations. This method returns the styles for the section
   * where the caret is currently located, enabling section-aware UI components
   * like rulers to display accurate information.
   *
   * @returns Object containing:
   *   - pageSize: { width, height } in inches
   *   - pageMargins: { left, right, top, bottom } in inches
   *   - sectionIndex: The current section index (0-based)
   *   - orientation: 'portrait' or 'landscape'
   *
   * Falls back to document-level defaults if section info is unavailable.
   *
   * @example
   * ```typescript
   * const sectionStyles = presentation.getCurrentSectionPageStyles();
   * console.log(`Section ${sectionStyles.sectionIndex}: ${sectionStyles.pageSize.width}" x ${sectionStyles.pageSize.height}"`);
   * ```
   */
  getCurrentSectionPageStyles(): {
    pageSize: { width: number; height: number };
    pageMargins: { left: number; right: number; top: number; bottom: number };
    sectionIndex: number;
    orientation: 'portrait' | 'landscape';
  } {
    const PPI = 96;
    const layout = this.#layoutState.layout;
    const pageIndex = this.#getCurrentPageIndex();
    const page = layout?.pages?.[pageIndex];

    const converterStyles = this.#editor.converter?.pageStyles ?? {};
    const defaultMargins = converterStyles.pageMargins ?? { left: 1, right: 1, top: 1, bottom: 1 };

    // Validate margin values to prevent NaN
    const safeMargins = {
      left: typeof defaultMargins.left === 'number' ? defaultMargins.left : 1,
      right: typeof defaultMargins.right === 'number' ? defaultMargins.right : 1,
      top: typeof defaultMargins.top === 'number' ? defaultMargins.top : 1,
      bottom: typeof defaultMargins.bottom === 'number' ? defaultMargins.bottom : 1,
    };

    if (!page) {
      return {
        pageSize: { width: 8.5, height: 11 },
        pageMargins: safeMargins,
        sectionIndex: 0,
        orientation: 'portrait',
      };
    }

    // Validate orientation
    const pageOrientation =
      page.orientation === 'landscape' || page.orientation === 'portrait' ? page.orientation : 'portrait';

    // Determine page size based on orientation if not explicitly set.
    // Don't use converterStyles.pageSize as fallback - it may be from a different section.
    const standardPortrait = { w: 8.5 * PPI, h: 11 * PPI };
    const standardLandscape = { w: 11 * PPI, h: 8.5 * PPI };
    const orientationDefault = pageOrientation === 'landscape' ? standardLandscape : standardPortrait;

    const pageWidthPx = page.size?.w ?? orientationDefault.w;
    const pageHeightPx = page.size?.h ?? orientationDefault.h;

    const marginLeftPx = page.margins?.left ?? safeMargins.left * PPI;
    const marginRightPx = page.margins?.right ?? safeMargins.right * PPI;
    const marginTopPx = page.margins?.top ?? safeMargins.top * PPI;
    const marginBottomPx = page.margins?.bottom ?? safeMargins.bottom * PPI;

    return {
      pageSize: {
        width: pageWidthPx / PPI,
        height: pageHeightPx / PPI,
      },
      pageMargins: {
        left: marginLeftPx / PPI,
        right: marginRightPx / PPI,
        top: marginTopPx / PPI,
        bottom: marginBottomPx / PPI,
      },
      sectionIndex: page.sectionIndex ?? 0,
      orientation: pageOrientation,
    };
  }

  /**
   * Get current remote cursor states (normalized to absolute PM positions).
   * Returns an array of cursor states for all remote collaborators, excluding the local user.
   *
   * Exposes normalized awareness states for host consumption.
   * Hosts can use this to build custom presence UI (e.g., presence pills, sidebar lists).
   *
   * @returns Array of remote cursor states with PM positions and user metadata
   *
   * @example
   * ```typescript
   * const presentation = PresentationEditor.getInstance('doc-123');
   * const cursors = presentation.getRemoteCursors();
   * cursors.forEach(cursor => {
   *   console.log(`${cursor.user.name} at position ${cursor.head}`);
   * });
   * ```
   */
  getRemoteCursors(): RemoteCursorState[] {
    return Array.from(this.#remoteCursorState.values());
  }

  /**
   * Adjust layout mode (vertical/book/horizontal) and rerender.
   *
   * Changes how pages are arranged visually:
   * - 'vertical': Pages stacked vertically (default)
   * - 'book': Two-page spread side-by-side
   * - 'horizontal': Pages arranged horizontally
   *
   * Note: Virtualization is automatically disabled for non-vertical modes.
   *
   * @param mode - The layout mode to set
   *
   * @example
   * ```typescript
   * presentation.setLayoutMode('book'); // Two-page spread
   * presentation.setLayoutMode('vertical'); // Back to single column
   * ```
   */
  setLayoutMode(mode: LayoutMode) {
    if (!mode || this.#layoutOptions.layoutMode === mode) {
      return;
    }
    this.#layoutOptions.layoutMode = mode;
    if (mode !== 'vertical' && this.#layoutOptions.virtualization?.enabled) {
      this.#layoutOptions.virtualization = {
        ...this.#layoutOptions.virtualization,
        enabled: false,
      };
    }
    this.#domPainter = null;
    this.#pendingDocChange = true;
    this.#scheduleRerender();
  }

  /**
   * Convert a viewport coordinate into a document hit using the current layout.
   */
  hitTest(clientX: number, clientY: number): PositionHit | null {
    const normalized = this.#normalizeClientPoint(clientX, clientY);
    if (!normalized) {
      return null;
    }

    if (this.#session.mode !== 'body') {
      const context = this.#getHeaderFooterContext();
      if (!context) {
        return null;
      }
      const headerPageHeight = context.layout.pageSize?.h ?? context.region.height ?? 1;
      const bodyPageHeight = this.#getBodyPageHeight();
      const pageIndex = Math.max(0, Math.floor(normalized.y / bodyPageHeight));
      if (pageIndex !== context.region.pageIndex) {
        return null;
      }
      const localX = normalized.x - context.region.localX;
      const localY = normalized.y - context.region.pageIndex * bodyPageHeight - context.region.localY;
      if (localX < 0 || localY < 0 || localX > context.region.width || localY > context.region.height) {
        return null;
      }
      const headerPageIndex = Math.floor(localY / headerPageHeight);
      const headerPoint = {
        x: localX,
        y: headerPageIndex * headerPageHeight + (localY - headerPageIndex * headerPageHeight),
      };
      const hit = clickToPosition(context.layout, context.blocks, context.measures, headerPoint) ?? null;
      return hit;
    }

    if (!this.#layoutState.layout) {
      return null;
    }
    const hit =
      clickToPosition(
        this.#layoutState.layout,
        this.#layoutState.blocks,
        this.#layoutState.measures,
        normalized,
        this.#viewportHost,
        clientX,
        clientY,
      ) ?? null;
    return hit;
  }

  /**
   * Normalize viewport coordinates (clientX/clientY) into layout space while respecting zoom + scroll.
   */
  normalizeClientPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    return this.#normalizeClientPoint(clientX, clientY);
  }

  /**
   * Get viewport coordinates for a document position (header/footer-aware).
   *
   * This method provides coordinate mapping that respects the current editing mode:
   * - In body mode, uses the main document layout
   * - In header/footer mode, maps positions within the header/footer layout and transforms
   *   coordinates to viewport space
   *
   * @param pos - Document position in the active editor
   * @returns Coordinate rectangle with top, bottom, left, right, width, height in viewport pixels,
   *          or null if the position cannot be mapped
   *
   * @example
   * ```typescript
   * const coords = presentationEditor.coordsAtPos(42);
   * if (coords) {
   *   console.log(`Position 42 is at viewport coordinates (${coords.left}, ${coords.top})`);
   * }
   * ```
   */
  coordsAtPos(
    pos: number,
  ): { top: number; bottom: number; left: number; right: number; width: number; height: number } | null {
    if (!Number.isFinite(pos)) {
      console.warn('[PresentationEditor] coordsAtPos called with invalid position:', pos);
      return null;
    }

    // In header/footer mode, use header/footer layout coordinates
    if (this.#session.mode !== 'body') {
      const context = this.#getHeaderFooterContext();
      if (!context) {
        console.warn('[PresentationEditor] Header/footer context not available for coordsAtPos');
        return null;
      }

      // Get selection rects from the header/footer layout (already transformed to viewport)
      const rects = this.#computeHeaderFooterSelectionRects(pos, pos);
      if (!rects || rects.length === 0) {
        return null;
      }

      const rect = rects[0];
      const zoom = this.#layoutOptions.zoom ?? 1;
      const containerRect = this.#visibleHost.getBoundingClientRect();
      const scrollLeft = this.#visibleHost.scrollLeft ?? 0;
      const scrollTop = this.#visibleHost.scrollTop ?? 0;
      const pageHeight = this.#getBodyPageHeight();
      const pageGap = this.#layoutState.layout?.pageGap ?? 0;
      const pageLocalY = rect.y - rect.pageIndex * (pageHeight + pageGap);
      const coords = this.#convertPageLocalToOverlayCoords(rect.pageIndex, rect.x, pageLocalY);
      if (!coords) return null;

      return {
        top: coords.y * zoom - scrollTop + containerRect.top,
        bottom: coords.y * zoom - scrollTop + containerRect.top + rect.height * zoom,
        left: coords.x * zoom - scrollLeft + containerRect.left,
        right: coords.x * zoom - scrollLeft + containerRect.left + rect.width * zoom,
        width: rect.width * zoom,
        height: rect.height * zoom,
      };
    }

    // In body mode, use main document layout
    const rects = this.getRangeRects(pos, pos);
    if (!rects || rects.length === 0) {
      return null;
    }

    const rect = rects[0];
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
    };
  }

  /**
   * Get document position from viewport coordinates (header/footer-aware).
   *
   * This method maps viewport coordinates to document positions while respecting
   * the current editing mode:
   * - In body mode, performs hit testing on the main document layout
   * - In header/footer mode, hit tests within the active header/footer region
   * - Returns null if coordinates are outside the editable area
   *
   * @param coords - Viewport coordinates (clientX/clientY)
   * @returns Position result with pos and inside properties, or null if no match
   *
   * @example
   * ```typescript
   * const result = presentationEditor.posAtCoords({ clientX: 100, clientY: 200 });
   * if (result) {
   *   console.log(`Clicked at document position ${result.pos}`);
   * }
   * ```
   */
  posAtCoords(coords: {
    clientX?: number;
    clientY?: number;
    left?: number;
    top?: number;
  }): { pos: number; inside: number } | null {
    // Accept multiple coordinate formats for compatibility
    const clientX = coords?.clientX ?? coords?.left ?? null;
    const clientY = coords?.clientY ?? coords?.top ?? null;

    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      console.warn('[PresentationEditor] posAtCoords called with invalid coordinates:', coords);
      return null;
    }

    // Use hitTest which already handles both body and header/footer modes
    const hit = this.hitTest(clientX!, clientY!);
    if (!hit) {
      return null;
    }

    // Return in ProseMirror-compatible format
    // Note: 'inside' indicates the depth of the node clicked (ProseMirror-specific).
    // We use -1 as a default to indicate we're not inside a specific node boundary,
    // which is the typical behavior for layout-based coordinate mapping.
    return {
      pos: hit.pos,
      inside: -1,
    };
  }

  /**
   * Aggregate an array of rects into a single bounding box.
   */
  #aggregateLayoutBounds(
    rects: RangeRect[],
  ): { top: number; left: number; bottom: number; right: number; width: number; height: number } | null {
    if (!rects.length) return null;
    const top = Math.min(...rects.map((rect) => rect.top));
    const left = Math.min(...rects.map((rect) => rect.left));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    const right = Math.max(...rects.map((rect) => rect.right));
    if (!Number.isFinite(top) || !Number.isFinite(left) || !Number.isFinite(bottom) || !Number.isFinite(right)) {
      return null;
    }
    return {
      top,
      left,
      bottom,
      right,
      width: right - left,
      height: bottom - top,
    };
  }

  /**
   * Update zoom level and re-render.
   *
   * @param zoom - Zoom level multiplier (1.0 = 100%). Must be a positive finite number.
   * @throws {TypeError} If zoom is not a number
   * @throws {RangeError} If zoom is not finite, is <= 0, or is NaN
   *
   * @example
   * ```typescript
   * editor.setZoom(1.5); // 150% zoom
   * editor.setZoom(0.75); // 75% zoom
   * ```
   */
  setZoom(zoom: number) {
    if (typeof zoom !== 'number') {
      throw new TypeError(`[PresentationEditor] setZoom expects a number, received ${typeof zoom}`);
    }
    if (Number.isNaN(zoom)) {
      throw new RangeError('[PresentationEditor] setZoom expects a valid number (not NaN)');
    }
    if (!Number.isFinite(zoom)) {
      throw new RangeError('[PresentationEditor] setZoom expects a finite number');
    }
    if (zoom <= 0) {
      throw new RangeError('[PresentationEditor] setZoom expects a positive number greater than 0');
    }
    if (zoom > MAX_ZOOM_WARNING_THRESHOLD) {
      console.warn(
        `[PresentationEditor] Zoom level ${zoom} exceeds recommended maximum of ${MAX_ZOOM_WARNING_THRESHOLD}. Performance may degrade.`,
      );
    }
    this.#layoutOptions.zoom = zoom;
    this.#applyZoom();
    this.#scheduleSelectionUpdate();
    // Trigger cursor updates on zoom changes
    if (this.#remoteCursorState.size > 0) {
      this.#remoteCursorDirty = true;
      this.#scheduleRemoteCursorUpdate();
    }
    this.#pendingDocChange = true;
    this.#scheduleRerender();
  }

  /**
   * Safe cleanup helper that wraps cleanup functions in try-catch.
   * Logs errors without throwing, preventing cleanup chain interruption.
   *
   * @param fn - Cleanup function to execute
   * @param context - Description of what is being cleaned up (for error logging)
   * @private
   */
  #safeCleanup(fn: () => void, context: string): void {
    try {
      fn();
    } catch (error) {
      console.warn(`[PresentationEditor] ${context} cleanup failed:`, error);
    }
  }

  /**
   * Clean up editor + DOM nodes.
   * Safe to call during partial initialization.
   */
  destroy() {
    // Cancel pending layout RAF
    if (this.#rafHandle != null) {
      this.#safeCleanup(() => {
        const win = this.#visibleHost?.ownerDocument?.defaultView ?? window;
        win.cancelAnimationFrame(this.#rafHandle!);
        this.#rafHandle = null;
      }, 'Layout RAF');
    }

    // Cancel pending remote cursor throttle timeout to prevent execution after destroy
    if (this.#remoteCursorThrottleTimeout !== null) {
      this.#safeCleanup(() => {
        clearTimeout(this.#remoteCursorThrottleTimeout!);
        this.#remoteCursorThrottleTimeout = null;
      }, 'Remote cursor throttle');
    }

    this.#editorListeners.forEach(({ event, handler }) => this.#editor?.off(event, handler));
    this.#editorListeners = [];

    this.#viewportHost?.removeEventListener('pointerdown', this.#handlePointerDown);
    this.#viewportHost?.removeEventListener('dblclick', this.#handleDoubleClick);
    this.#viewportHost?.removeEventListener('pointermove', this.#handlePointerMove);
    this.#viewportHost?.removeEventListener('pointerup', this.#handlePointerUp);
    this.#viewportHost?.removeEventListener('pointerleave', this.#handlePointerLeave);
    this.#viewportHost?.removeEventListener('dragover', this.#handleDragOver);
    this.#viewportHost?.removeEventListener('drop', this.#handleDrop);
    this.#visibleHost?.removeEventListener('keydown', this.#handleKeyDown);
    this.#inputBridge?.notifyTargetChanged();
    this.#inputBridge?.destroy();
    this.#inputBridge = null;

    // Clean up collaboration cursor subscriptions
    if (this.#awarenessCleanup) {
      this.#awarenessCleanup();
      this.#awarenessCleanup = null;
    }

    if (this.#scrollCleanup) {
      this.#scrollCleanup();
      this.#scrollCleanup = null;
    }

    this.#remoteCursorState.clear();
    this.#remoteCursorElements.clear();
    this.#remoteCursorOverlay = null;

    // Clean up cell selection drag state to prevent memory leaks
    this.#clearCellAnchor();

    // Unregister from static registry
    if (this.#options?.documentId) {
      PresentationEditor.#instances.delete(this.#options.documentId);
    }

    this.#headerFooterManagerCleanups.forEach((fn) => this.#safeCleanup(fn, 'Header/footer'));
    this.#headerFooterManagerCleanups = [];
    this.#safeCleanup(() => {
      this.#headerFooterAdapter?.clear();
      this.#headerFooterAdapter = null;
    }, 'Header/footer adapter');
    this.#safeCleanup(() => {
      this.#headerFooterManager?.destroy();
      this.#headerFooterManager = null;
    }, 'Header/footer manager');
    this.#headerFooterIdentifier = null;
    this.#multiSectionIdentifier = null;
    this.#headerLayoutResults = null;
    this.#footerLayoutResults = null;
    this.#headerLayoutsByRId.clear();
    this.#footerLayoutsByRId.clear();
    this.#headerDecorationProvider = undefined;
    this.#footerDecorationProvider = undefined;
    this.#session = { mode: 'body' };
    this.#activeHeaderFooterEditor = null;

    this.#domPainter = null;
    this.#dragHandlerCleanup?.();
    this.#dragHandlerCleanup = null;
    this.#selectionOverlay?.remove();
    this.#painterHost?.remove();
    this.#hiddenHost?.remove();
    this.#hoverOverlay = null;
    this.#hoverTooltip = null;
    this.#modeBanner?.remove();
    this.#modeBanner = null;
    this.#ariaLiveRegion?.remove();
    this.#ariaLiveRegion = null;
    this.#errorBanner?.remove();
    if (this.#editor) {
      (this.#editor as Editor & { presentationEditor?: PresentationEditor | null }).presentationEditor = null;
      this.#editor.destroy();
    }
  }

  #setupEditorListeners() {
    const handleUpdate = ({ transaction }: { transaction?: { docChanged?: boolean } }) => {
      const trackedChangesChanged = this.#syncTrackedChangesPreferences();
      if (trackedChangesChanged || transaction?.docChanged) {
        this.#pendingDocChange = true;
        this.#scheduleRerender();
      }
      // Update local cursor in awareness whenever document changes
      // This ensures cursor position is broadcast with each keystroke
      if (transaction?.docChanged) {
        this.#updateLocalAwarenessCursor();
        // Clear cell anchor on document changes to prevent stale references
        // (table structure may have changed, cell positions may be invalid)
        this.#clearCellAnchor();
      }
    };
    const handleSelection = () => {
      this.#scheduleSelectionUpdate();
      // Update local cursor in awareness for collaboration
      // This bypasses y-prosemirror's focus check which may fail for hidden PM views
      this.#updateLocalAwarenessCursor();
    };
    this.#editor.on('update', handleUpdate);
    this.#editor.on('selectionUpdate', handleSelection);
    this.#editorListeners.push({ event: 'update', handler: handleUpdate as (...args: unknown[]) => void });
    this.#editorListeners.push({ event: 'selectionUpdate', handler: handleSelection as (...args: unknown[]) => void });

    // Listen for page style changes (e.g., margin adjustments via ruler).
    // These changes don't modify document content (docChanged === false),
    // so the 'update' event isn't emitted. The dedicated pageStyleUpdate event
    // provides clearer semantics and better debugging than checking transaction meta flags.
    const handlePageStyleUpdate = () => {
      this.#pendingDocChange = true;
      this.#scheduleRerender();
    };
    this.#editor.on('pageStyleUpdate', handlePageStyleUpdate);
    this.#editorListeners.push({
      event: 'pageStyleUpdate',
      handler: handlePageStyleUpdate as (...args: unknown[]) => void,
    });

    const handleCollaborationReady = (payload: unknown) => {
      this.emit('collaborationReady', payload);
      // Setup remote cursor rendering after collaboration is ready
      // Only setup if presence is enabled in layout options
      if (this.#options.collaborationProvider?.awareness && this.#layoutOptions.presence?.enabled !== false) {
        this.#setupCollaborationCursors();
      }
    };
    this.#editor.on('collaborationReady', handleCollaborationReady);
    this.#editorListeners.push({
      event: 'collaborationReady',
      handler: handleCollaborationReady as (...args: unknown[]) => void,
    });
  }

  /**
   * Setup awareness event subscriptions for remote cursor tracking.
   * Includes scroll listener for virtualization updates.
   * Called after collaborationReady event when ySync plugin is initialized.
   * Prevents double-initialization by cleaning up existing subscriptions first.
   * @private
   */
  #setupCollaborationCursors() {
    const provider = this.#options.collaborationProvider;
    if (!provider?.awareness) return;

    // Prevent double-initialization: cleanup existing subscriptions
    if (this.#awarenessCleanup) {
      this.#awarenessCleanup();
      this.#awarenessCleanup = null;
    }
    if (this.#scrollCleanup) {
      this.#scrollCleanup();
      this.#scrollCleanup = null;
    }

    const handleAwarenessChange = () => {
      this.#remoteCursorDirty = true;
      this.#scheduleRemoteCursorUpdate();
    };

    provider.awareness.on('change', handleAwarenessChange);
    provider.awareness.on('update', handleAwarenessChange);

    // Store cleanup function for awareness subscriptions
    this.#awarenessCleanup = () => {
      provider.awareness?.off('change', handleAwarenessChange);
      provider.awareness?.off('update', handleAwarenessChange);
    };

    // Setup scroll listener for virtualization updates
    // When scrolling causes pages to mount/unmount, we need to re-render cursors
    // Attach to #visibleHost (the actual scrolling element) instead of #painterHost
    // This ensures remote cursors update during pagination/virtualization as the container scrolls
    const handleScroll = () => {
      if (this.#remoteCursorState.size > 0) {
        this.#remoteCursorDirty = true;
        this.#scheduleRemoteCursorUpdate();
      }
    };

    // Debounce scroll updates to avoid excessive re-renders
    // Use instance-level scrollTimeout for proper cleanup
    const debouncedHandleScroll = () => {
      if (this.#scrollTimeout !== undefined) {
        clearTimeout(this.#scrollTimeout);
      }
      this.#scrollTimeout = window.setTimeout(handleScroll, SCROLL_DEBOUNCE_MS);
    };

    this.#visibleHost.addEventListener('scroll', debouncedHandleScroll, { passive: true });

    // Store cleanup function for scroll listener
    // Clear pending timeout to prevent memory leak when component is destroyed
    this.#scrollCleanup = () => {
      if (this.#scrollTimeout !== undefined) {
        clearTimeout(this.#scrollTimeout);
        this.#scrollTimeout = undefined;
      }
      this.#visibleHost.removeEventListener('scroll', debouncedHandleScroll);
    };

    // Trigger initial normalization for existing collaborators
    // When joining a session with existing collaborators, awareness.getStates() has data
    // but no 'change' event fires, so we need to normalize immediately
    handleAwarenessChange();
  }

  /**
   * Update local cursor position in awareness.
   *
   * CRITICAL FIX: The y-prosemirror cursor plugin only updates awareness when
   * view.hasFocus() returns true. In PresentationEditor, the hidden PM EditorView
   * may not have DOM focus (focus is on the visual representation / input bridge).
   * This causes the cursor plugin to not send cursor updates, making remote users
   * see a stale cursor position.
   *
   * This method bypasses the focus check and manually updates awareness with the
   * current selection position whenever the PM selection changes.
   *
   * @private
   * @returns {void}
   * @throws {Error} Position conversion errors are silently caught and ignored.
   *   These can occur during document restructuring when the PM document structure
   *   doesn't match the Yjs structure, or when positions are temporarily invalid.
   */
  #updateLocalAwarenessCursor(): void {
    const provider = this.#options.collaborationProvider;
    if (!provider?.awareness) return;

    // Runtime validation: ensure setLocalStateField method exists
    if (typeof provider.awareness.setLocalStateField !== 'function') {
      // Awareness implementation doesn't support setLocalStateField
      return;
    }

    const editorState = this.#editor?.state;
    if (!editorState) return;

    const ystate = ySyncPluginKey.getState(editorState);
    if (!ystate?.binding?.mapping) return;

    const { selection } = editorState;
    const { anchor, head } = selection;

    try {
      // Convert PM positions to Yjs relative positions
      const relAnchor = absolutePositionToRelativePosition(anchor, ystate.type, ystate.binding.mapping);
      const relHead = absolutePositionToRelativePosition(head, ystate.type, ystate.binding.mapping);

      if (relAnchor && relHead) {
        // Update awareness with cursor position
        // Use 'cursor' as the field name to match y-prosemirror's convention
        const cursorData: AwarenessCursorData = {
          anchor: relAnchor,
          head: relHead,
        };
        provider.awareness.setLocalStateField('cursor', cursorData);
      }
    } catch {
      // Silently ignore conversion errors - can happen during document restructuring
    }
  }

  /**
   * Normalize awareness states from Yjs relative positions to absolute PM positions.
   * Converts remote cursor data into PresentationEditor-friendly coordinate space.
   * @private
   */
  #normalizeAwarenessStates(): Map<number, RemoteCursorState> {
    const provider = this.#options.collaborationProvider;
    if (!provider?.awareness) return new Map();

    const editorState = this.#editor?.state;
    if (!editorState) return new Map();

    const ystate = ySyncPluginKey.getState(editorState);
    if (!ystate) return new Map(); // No ySync plugin

    const states = provider.awareness?.getStates();
    const normalized = new Map<number, RemoteCursorState>();

    states?.forEach((aw, clientId) => {
      // Skip local client
      if (clientId === provider.awareness?.clientID) return;

      // Skip states without cursor data
      if (!aw.cursor) return;

      try {
        // Convert relative positions to absolute PM positions
        const anchor = relativePositionToAbsolutePosition(
          ystate.doc,
          ystate.type,
          Y.createRelativePositionFromJSON(aw.cursor.anchor),
          ystate.binding.mapping,
        );

        const head = relativePositionToAbsolutePosition(
          ystate.doc,
          ystate.type,
          Y.createRelativePositionFromJSON(aw.cursor.head),
          ystate.binding.mapping,
        );

        // Skip if conversion failed
        if (anchor === null || head === null) return;

        // Clamp to valid document range
        const docSize = this.#editor.state.doc.content.size;
        const clampedAnchor = Math.max(0, Math.min(anchor, docSize));
        const clampedHead = Math.max(0, Math.min(head, docSize));

        // Preserve timestamp if cursor position unchanged for stable recency-based sorting
        // This ensures maxVisible limit doesn't flicker when collaborators are idle
        const previousState = this.#remoteCursorState.get(clientId);
        const positionChanged =
          !previousState || previousState.anchor !== clampedAnchor || previousState.head !== clampedHead;

        normalized.set(clientId, {
          clientId,
          user: {
            name: aw.user?.name,
            email: aw.user?.email,
            color: aw.user?.color || this.#getFallbackColor(clientId),
          },
          anchor: clampedAnchor,
          head: clampedHead,
          updatedAt: positionChanged ? Date.now() : (previousState?.updatedAt ?? Date.now()),
        });
      } catch (error) {
        console.warn(`Failed to normalize cursor for client ${clientId}:`, error);
      }
    });

    // Memory management - clean up stale entries using configurable timeout
    // Prevents unbounded map growth in long-running sessions with many transient collaborators
    const staleTimeout = this.#layoutOptions.presence?.staleTimeout ?? DEFAULT_STALE_TIMEOUT_MS;
    const staleThreshold = Date.now() - staleTimeout;
    const staleClients: number[] = [];

    this.#remoteCursorState.forEach((cursor, clientId) => {
      if (cursor.updatedAt < staleThreshold && !normalized.has(clientId)) {
        staleClients.push(clientId);
      }
    });

    staleClients.forEach((clientId) => {
      this.#remoteCursorState.delete(clientId);
    });

    return normalized;
  }

  /**
   * Get fallback color for remote cursor when user.color is not provided.
   * Uses deterministic assignment based on clientId for consistency.
   * @private
   */
  #getFallbackColor(clientId: number): string {
    return PresentationEditor.FALLBACK_COLORS[clientId % PresentationEditor.FALLBACK_COLORS.length];
  }

  /**
   * Validate and normalize user color to ensure valid CSS hex format.
   * Prevents invalid colors from causing UI elements to disappear or render incorrectly.
   * All remote cursor rendering methods should use this helper for consistency.
   * @private
   */
  #getValidatedColor(cursor: RemoteCursorState): string {
    // Validate color format (always present per type, but may be malformed)
    return cursor.user.color.match(/^#[0-9A-Fa-f]{6}$/) ? cursor.user.color : this.#getFallbackColor(cursor.clientId);
  }

  /**
   * Schedule a remote cursor update using microtask + throttle-based rendering.
   *
   * CRITICAL: Uses queueMicrotask to defer cursor normalization until after all
   * synchronous code completes. This fixes a race condition where awareness events
   * fire before the ProseMirror state is updated with Yjs document changes:
   *
   * 1. WebSocket message arrives with doc update + awareness update
   * 2. Yjs doc is updated, sync plugin starts creating PM transaction
   * 3. Awareness update fires events (PresentationEditor handler called)
   * 4. If we read PM state NOW, it may not have the new text yet
   * 5. Cursor position conversion uses stale mapping → wrong position
   *
   * By deferring to a microtask, we ensure:
   * - All synchronous code completes (including PM transaction dispatch)
   * - PM state reflects the latest Yjs document state
   * - Cursor positions are calculated correctly
   *
   * Throttling is still applied (60fps max) to prevent excessive re-renders.
   *
   * @private
   */
  #scheduleRemoteCursorUpdate() {
    // Skip scheduling entirely when presence is disabled
    // This avoids unnecessary scheduling when the feature is toggled off
    if (this.#layoutOptions.presence?.enabled === false) return;

    // Already have a pending update scheduled
    if (this.#remoteCursorUpdateScheduled) return;
    this.#remoteCursorUpdateScheduled = true;

    // Use microtask to defer until after PM state is synced with Yjs
    queueMicrotask(() => {
      if (!this.#remoteCursorUpdateScheduled) return; // Was cancelled

      const now = performance.now();
      const elapsed = now - this.#lastRemoteCursorRenderTime;
      /**
       * Throttle window for remote cursor updates (milliseconds).
       * Set to 16ms to target ~60fps rendering (one animation frame at 60Hz).
       * This prevents excessive re-renders during rapid awareness updates while
       * maintaining smooth visual feedback for collaboration cursors.
       * Using requestAnimationFrame would be ideal, but microtask deferral is
       * critical for fixing the race condition with Yjs state synchronization.
       */
      const THROTTLE_MS = 16;

      // If enough time has passed, render now
      if (elapsed >= THROTTLE_MS) {
        // Clear any pending trailing edge timeout
        if (this.#remoteCursorThrottleTimeout !== null) {
          clearTimeout(this.#remoteCursorThrottleTimeout);
          this.#remoteCursorThrottleTimeout = null;
        }
        this.#remoteCursorUpdateScheduled = false;
        this.#lastRemoteCursorRenderTime = now;
        this.#updateRemoteCursors();
        return;
      }

      // Within throttle window: schedule trailing edge render
      const remaining = THROTTLE_MS - elapsed;
      this.#remoteCursorThrottleTimeout = window.setTimeout(() => {
        this.#remoteCursorUpdateScheduled = false;
        this.#remoteCursorThrottleTimeout = null;
        this.#lastRemoteCursorRenderTime = performance.now();
        this.#updateRemoteCursors();
      }, remaining) as unknown as number;
    });
  }

  /**
   * Schedule a remote cursor re-render without re-normalizing awareness states.
   * Performance optimization: avoids expensive Yjs position conversions on layout changes.
   * Used when layout geometry changes but cursor positions haven't (e.g., zoom, scroll, reflow).
   *
   * Note: This method doesn't need microtask deferral because it uses already-computed
   * PM positions from #remoteCursorState, not awareness relative positions.
   * @private
   */
  #scheduleRemoteCursorReRender() {
    if (this.#layoutOptions.presence?.enabled === false) return;
    if (this.#remoteCursorUpdateScheduled) return;
    this.#remoteCursorUpdateScheduled = true;

    // Use RAF for re-renders since they're triggered by layout/scroll events
    // and should align with the browser's paint cycle
    const win = this.#visibleHost.ownerDocument?.defaultView ?? window;
    win.requestAnimationFrame(() => {
      this.#remoteCursorUpdateScheduled = false;
      this.#lastRemoteCursorRenderTime = performance.now();
      this.#renderRemoteCursors();
    });
  }

  /**
   * Update remote cursor state, render overlays, and emit event for host consumption.
   * Normalizes awareness states, applies performance guardrails, and renders cursor/selection overlays.
   * @private
   */
  #updateRemoteCursors() {
    // Gate behind presence.enabled check
    // Clear overlay DOM BEFORE returning when presence is disabled
    // This ensures already-rendered cursors are wiped when toggling presence off
    if (this.#layoutOptions.presence?.enabled === false) {
      this.#remoteCursorState.clear();
      this.#remoteCursorElements.clear();
      if (this.#remoteCursorOverlay) {
        this.#remoteCursorOverlay.innerHTML = '';
      }
      return;
    }

    if (!this.#remoteCursorDirty) return;
    this.#remoteCursorDirty = false;

    // Track render start time for telemetry
    const startTime = performance.now();

    // Normalize awareness states to PM positions
    this.#remoteCursorState = this.#normalizeAwarenessStates();

    // Render cursors with existing state
    this.#renderRemoteCursors();

    // Emit event for host consumption
    this.emit('remoteCursorsUpdate', {
      cursors: Array.from(this.#remoteCursorState.values()),
    });

    // Optional telemetry for monitoring performance
    if (this.#telemetryEmitter) {
      const renderTime = performance.now() - startTime;
      const maxVisible = this.#layoutOptions.presence?.maxVisible ?? 20;
      const visibleCount = Math.min(this.#remoteCursorState.size, maxVisible);
      this.#telemetryEmitter({
        type: 'remoteCursorsRender',
        data: {
          collaboratorCount: this.#remoteCursorState.size,
          visibleCount,
          renderTimeMs: renderTime,
        },
      });
    }
  }

  /**
   * Render remote cursors from existing state without normalization.
   * Extracted rendering logic to support both full updates and geometry-only re-renders.
   * Used by #updateRemoteCursors (after awareness normalization) and #scheduleRemoteCursorReRender
   * (when only layout geometry changes, not cursor positions).
   *
   * FLICKER PREVENTION: This method reuses existing DOM elements instead of clearing
   * and recreating them. Elements are keyed by clientId and only created/removed when
   * clients join/leave. Position updates use CSS transitions for smooth movement.
   *
   * @private
   */
  #renderRemoteCursors() {
    // Get layout state for geometry calculations
    const layout = this.#layoutState?.layout;
    const blocks = this.#layoutState?.blocks;
    const measures = this.#layoutState?.measures;

    if (!layout || !blocks || !measures) {
      // Layout not ready, skip rendering
      return;
    }

    // Apply performance guardrails: maxVisible limit
    const maxVisible = this.#layoutOptions.presence?.maxVisible ?? 20;
    const sortedCursors = Array.from(this.#remoteCursorState.values())
      .sort((a, b) => b.updatedAt - a.updatedAt) // Most recent first
      .slice(0, maxVisible);

    // Track which clientIds are currently visible
    const visibleClientIds = new Set<number>();

    // Render/update each remote cursor
    sortedCursors.forEach((cursor) => {
      visibleClientIds.add(cursor.clientId);

      // Clear old selection rectangles for this user before rendering new state.
      // Selection rects are not tracked in #remoteCursorElements (only carets are),
      // so we must query and remove them to prevent "stuck" selections when a user's
      // selection changes position or collapses to a caret.
      const oldSelections = this.#remoteCursorOverlay?.querySelectorAll(
        `.presentation-editor__remote-selection[data-client-id="${cursor.clientId}"]`,
      );
      oldSelections?.forEach((el) => el.remove());

      if (cursor.anchor === cursor.head) {
        // Render caret only
        this.#renderRemoteCaret(cursor);
      } else {
        // Render selection + caret at head
        this.#renderRemoteSelection(cursor);
      }
    });

    // Remove DOM elements for clients that are no longer visible
    this.#remoteCursorElements.forEach((element, clientId) => {
      if (!visibleClientIds.has(clientId)) {
        element.remove();
        this.#remoteCursorElements.delete(clientId);
      }
    });
  }

  /**
   * Render a remote collaborator's caret at their current cursor position.
   *
   * This method computes the precise pixel position of a collaborator's cursor using the layout
   * engine's geometry helpers, converts it to overlay coordinates (accounting for zoom, scroll,
   * and virtualization), and renders a colored vertical bar with an optional name label.
   *
   * **Virtualization handling:** If the cursor's position falls on a page that is not currently
   * mounted in the DOM (due to virtualization), the element is hidden but retained in memory.
   * It will be shown again when the page becomes visible.
   *
   * **Flicker prevention:** Reuses existing DOM elements when possible, updating positions via
   * CSS transforms with smooth transitions. Elements are only created for new clients.
   *
   * **Performance:** Uses GPU-accelerated CSS transforms and respects the maxVisible limit
   * enforced by the parent #updateRemoteCursors method.
   *
   * @param cursor - The normalized remote cursor state containing PM position and user metadata
   * @private
   */
  #renderRemoteCaret(cursor: RemoteCursorState) {
    // Use existing geometry helper to get caret layout rect
    const caretLayout = this.#computeCaretLayoutRect(cursor.head);

    // Use effective zoom from actual rendered dimensions for consistent scaling
    const zoom = this.#layoutOptions.zoom ?? 1;
    const doc = this.#visibleHost.ownerDocument ?? document;
    const color = this.#getValidatedColor(cursor);

    // Check if we already have a DOM element for this client
    let caretEl = this.#remoteCursorElements.get(cursor.clientId);
    const isNewElement = !caretEl;

    if (isNewElement) {
      // Create new caret element
      caretEl = doc.createElement('div');
      caretEl.className = 'presentation-editor__remote-caret';
      caretEl.style.position = 'absolute';
      caretEl.style.width = `${PresentationEditor.CURSOR_STYLES.CARET_WIDTH}px`;
      caretEl.style.borderLeft = `${PresentationEditor.CURSOR_STYLES.CARET_WIDTH}px solid ${color}`;
      caretEl.style.pointerEvents = 'none';
      // GPU-accelerated transitions for smooth movement
      caretEl.style.transition = 'transform 50ms ease-out, height 50ms ease-out, opacity 100ms ease-out';
      caretEl.style.willChange = 'transform';
      caretEl.setAttribute('data-client-id', cursor.clientId.toString());
      caretEl.setAttribute('aria-hidden', 'true');

      // Add label if enabled
      if (this.#layoutOptions.presence?.showLabels !== false) {
        this.#renderRemoteCursorLabel(caretEl, cursor);
      }

      this.#remoteCursorElements.set(cursor.clientId, caretEl);
      this.#remoteCursorOverlay?.appendChild(caretEl);
    }

    // Handle case where position can't be computed or page is virtualized
    if (!caretLayout) {
      caretEl!.style.opacity = '0';
      return;
    }

    const coords = this.#convertPageLocalToOverlayCoords(caretLayout.pageIndex, caretLayout.x, caretLayout.y);
    if (!coords) {
      caretEl!.style.opacity = '0';
      return;
    }

    // Update position using transform for GPU acceleration
    caretEl!.style.opacity = '1';
    caretEl!.style.transform = `translate(${coords.x}px, ${coords.y}px)`;
    // Height is in layout space - the transform on #viewportHost handles scaling
    caretEl!.style.height = `${Math.max(1, caretLayout.height)}px`;

    // Update color in case it changed
    caretEl!.style.borderLeftColor = color;

    // Update label background color if it exists
    const labelEl = caretEl!.querySelector('.presentation-editor__remote-label') as HTMLElement | null;
    if (labelEl) {
      labelEl.style.backgroundColor = color;
    }
  }

  /**
   * Render a label above a remote cursor showing the collaborator's name/email.
   *
   * The label is positioned directly above the caret and displays either the formatted
   * user name (via optional labelFormatter) or falls back to the user's name, email,
   * or "Anonymous" if neither is available.
   *
   * **Label formatting:** Hosts can customize label content via the `presence.labelFormatter`
   * option to show additional metadata (e.g., "Alice (Reviewing)").
   *
   * **Accessibility:** The label includes a tooltip (title attribute) showing the full name
   * and activity status for better discoverability.
   *
   * @param caretEl - The parent caret element to which the label will be appended
   * @param cursor - The normalized remote cursor state containing user metadata
   * @private
   */
  #renderRemoteCursorLabel(caretEl: HTMLElement, cursor: RemoteCursorState) {
    const labelFormatter = this.#layoutOptions.presence?.labelFormatter;
    let labelText = labelFormatter ? labelFormatter(cursor.user) : cursor.user.name || cursor.user.email || 'Anonymous';

    // Truncate very long names to prevent layout issues with oversized labels
    if (labelText.length > PresentationEditor.CURSOR_STYLES.MAX_LABEL_LENGTH) {
      labelText = labelText.substring(0, PresentationEditor.CURSOR_STYLES.MAX_LABEL_LENGTH - 1) + '…';
    }

    // Use validated color helper for consistency
    const color = this.#getValidatedColor(cursor);

    const doc = this.#visibleHost.ownerDocument ?? document;
    const labelEl = doc.createElement('div');
    labelEl.className = 'presentation-editor__remote-label';
    labelEl.textContent = labelText;
    labelEl.style.position = 'absolute';
    labelEl.style.top = PresentationEditor.CURSOR_STYLES.LABEL_OFFSET;
    labelEl.style.left = '-1px';
    labelEl.style.fontSize = `${PresentationEditor.CURSOR_STYLES.LABEL_FONT_SIZE}px`;
    labelEl.style.backgroundColor = color;
    labelEl.style.color = 'white';
    labelEl.style.padding = PresentationEditor.CURSOR_STYLES.LABEL_PADDING;
    labelEl.style.borderRadius = '3px';
    labelEl.style.whiteSpace = 'nowrap';
    labelEl.style.pointerEvents = 'none';
    labelEl.title = `${cursor.user.name || cursor.user.email} – editing`;

    caretEl.appendChild(labelEl);
  }

  /**
   * Render a remote collaborator's text selection as highlighted rectangles.
   *
   * When a collaborator has a text selection (anchor !== head), this method computes the
   * precise pixel rectangles for each line of the selection using the layout engine's
   * `selectionToRects` helper, then renders translucent overlay blocks in the user's color.
   * A caret is also rendered at the head position to indicate selection directionality.
   *
   * **Multi-line selections:** Each line of selected text produces a separate rectangle,
   * allowing selections to flow naturally across line breaks, columns, and page boundaries.
   *
   * **Multi-page selections:** Selections spanning page breaks will render rectangles on
   * multiple pages. Each rectangle is independently converted to overlay coordinates, so
   * virtualized pages are silently skipped without errors.
   *
   * **Performance guardrails:**
   * - Maximum 100 rectangles per user to prevent DOM explosion with very long selections
   * - GPU-accelerated rendering via CSS transforms
   *
   * **Rect calculations:** Uses `selectionToRects` from layout-bridge, which handles all
   * edge cases including RTL text, inline formatting, tables, and zero-width selections.
   *
   * @param cursor - The normalized remote cursor state with anchor/head positions
   * @private
   */
  #renderRemoteSelection(cursor: RemoteCursorState) {
    const layout = this.#layoutState?.layout;
    const blocks = this.#layoutState?.blocks;
    const measures = this.#layoutState?.measures;
    if (!layout || !blocks || !measures) return;

    // Normalize anchor/head order for backward selections
    // When a collaborator drag-selects "backwards" (head < anchor), selectionToRects
    // expects start <= end. Without normalization, backward selections return no rects.
    const start = Math.min(cursor.anchor, cursor.head);
    const end = Math.max(cursor.anchor, cursor.head);

    // Get selection rectangles using layout-bridge helper
    // Edge case: selectionToRects returns null for unsupported node types or empty documents
    const rects = selectionToRects(layout, blocks, measures, start, end) ?? [];

    // Validate color once at the start for all selection rects
    const color = this.#getValidatedColor(cursor);
    const opacity = this.#layoutOptions.presence?.highlightOpacity ?? 0.35;
    const pageHeight = layout.pageSize?.h ?? this.#layoutOptions.pageSize?.h ?? DEFAULT_PAGE_SIZE.h;
    const pageGap = layout.pageGap ?? 0;
    const doc = this.#visibleHost.ownerDocument ?? document;

    // Performance guardrail: max rects per user to prevent DOM explosion
    const limitedRects = rects.slice(0, MAX_SELECTION_RECTS_PER_USER);

    limitedRects.forEach((rect: LayoutRect) => {
      // Calculate page-local Y (rect.y is absolute from top of all pages)
      const pageLocalY = rect.y - rect.pageIndex * (pageHeight + pageGap);

      // Convert to overlay coordinates (handles zoom, scroll, virtualization)
      const coords = this.#convertPageLocalToOverlayCoords(rect.pageIndex, rect.x, pageLocalY);
      if (!coords) return; // Page not mounted (virtualized)

      // Create selection rectangle
      const selectionEl = doc.createElement('div');
      selectionEl.className = 'presentation-editor__remote-selection';
      selectionEl.style.position = 'absolute';
      selectionEl.style.left = `${coords.x}px`;
      selectionEl.style.top = `${coords.y}px`;
      // Width and height are in layout space - the transform on #viewportHost handles scaling
      selectionEl.style.width = `${Math.max(1, rect.width)}px`;
      selectionEl.style.height = `${Math.max(1, rect.height)}px`;
      selectionEl.style.backgroundColor = color;
      selectionEl.style.opacity = opacity.toString();
      selectionEl.style.borderRadius = PresentationEditor.CURSOR_STYLES.SELECTION_BORDER_RADIUS;
      selectionEl.style.pointerEvents = 'none';
      selectionEl.setAttribute('data-client-id', cursor.clientId.toString());

      // Remote selections are purely visual decorations - hide from accessibility tree
      selectionEl.setAttribute('aria-hidden', 'true');

      this.#remoteCursorOverlay?.appendChild(selectionEl);
    });

    // Also render caret at head position to indicate selection direction
    this.#renderRemoteCaret(cursor);
  }

  #setupPointerHandlers() {
    this.#viewportHost.addEventListener('pointerdown', this.#handlePointerDown);
    this.#viewportHost.addEventListener('dblclick', this.#handleDoubleClick);
    this.#viewportHost.addEventListener('pointermove', this.#handlePointerMove);
    this.#viewportHost.addEventListener('pointerup', this.#handlePointerUp);
    this.#viewportHost.addEventListener('pointerleave', this.#handlePointerLeave);
    this.#viewportHost.addEventListener('dragover', this.#handleDragOver);
    this.#viewportHost.addEventListener('drop', this.#handleDrop);
    this.#visibleHost.addEventListener('keydown', this.#handleKeyDown);
  }

  /**
   * Sets up drag and drop handlers for field annotations in the layout engine view.
   * Uses the DragHandler from layout-bridge to handle drag events and map drop
   * coordinates to ProseMirror positions.
   */
  #setupDragHandlers() {
    // Clean up any existing handler
    this.#dragHandlerCleanup?.();
    this.#dragHandlerCleanup = null;

    // Set up drag handler on the painter host (where layout engine renders)
    this.#dragHandlerCleanup = createDragHandler(this.#painterHost, {
      onDragOver: (event) => {
        if (!event.hasFieldAnnotation || event.event.clientX === 0) {
          return;
        }

        const activeEditor = this.getActiveEditor();
        if (!activeEditor?.isEditable) {
          return;
        }

        // Use the layout engine's hit testing to get the PM position
        const hit = this.hitTest(event.clientX, event.clientY);
        const doc = activeEditor.state?.doc;
        if (!hit || !doc) {
          return;
        }

        // Clamp position to valid range
        const pos = Math.min(Math.max(hit.pos, 1), doc.content.size);

        // Skip if cursor hasn't moved
        const currentSelection = activeEditor.state.selection;
        if (currentSelection instanceof TextSelection && currentSelection.from === pos && currentSelection.to === pos) {
          return;
        }

        // Update the selection to show caret at drop position
        try {
          const tr = activeEditor.state.tr.setSelection(TextSelection.create(doc, pos)).setMeta('addToHistory', false);
          activeEditor.view?.dispatch(tr);
          this.#scheduleSelectionUpdate();
        } catch {
          // Position may be invalid during layout updates - ignore
        }
      },
      onDrop: (event: DropEvent) => {
        // Prevent other drop handlers from double-processing
        event.event.preventDefault();
        event.event.stopPropagation();

        if (event.pmPosition === null) {
          return;
        }

        const activeEditor = this.getActiveEditor();
        const { state, view } = activeEditor;
        if (!state || !view) {
          return;
        }

        // If the source has fieldId (meaning it was dragged from an existing position),
        // we MOVE the field annotation (delete from old, insert at new)
        const fieldId = event.data.fieldId;
        if (fieldId) {
          const targetPos = event.pmPosition;

          // Find the field annotation in the current document by fieldId
          // This handles stale position data from DOM attributes after document edits
          let sourceStart: number | null = null;
          let sourceEnd: number | null = null;
          let sourceNode: typeof state.doc extends { nodeAt: (p: number) => infer N } ? N : never = null;

          state.doc.descendants((node, pos) => {
            if (node.type.name === 'fieldAnnotation' && (node.attrs as { fieldId?: string }).fieldId === fieldId) {
              sourceStart = pos;
              sourceEnd = pos + node.nodeSize;
              sourceNode = node;
              return false; // Stop traversal
            }
            return true;
          });

          if (sourceStart === null || sourceEnd === null || !sourceNode) {
            return;
          }

          // Skip if dropping at the same position (or immediately adjacent)
          if (targetPos >= sourceStart && targetPos <= sourceEnd) {
            return;
          }

          // Create a transaction to move the field annotation
          const tr = state.tr;

          // First delete the source annotation
          tr.delete(sourceStart, sourceEnd);

          // Use ProseMirror's mapping to get the correct target position after the delete
          // This properly handles document structure changes and edge cases
          const mappedTarget = tr.mapping.map(targetPos);

          // Validate the mapped position is within document bounds
          if (mappedTarget < 0 || mappedTarget > tr.doc.content.size) {
            return;
          }

          // Then insert the same node at the mapped target position
          tr.insert(mappedTarget, sourceNode);
          tr.setMeta('uiEvent', 'drop');

          view.dispatch(tr);
          return;
        }

        // No source position - this is a new drop from outside, insert directly if attributes look valid
        const attrs = event.data.attributes;
        if (attrs && isValidFieldAnnotationAttributes(attrs)) {
          const inserted = activeEditor.commands?.addFieldAnnotation?.(event.pmPosition, attrs, true);
          if (inserted) {
            this.#scheduleSelectionUpdate();
          }
          return;
        }

        // Fallback: emit event for any external handlers
        activeEditor.emit('fieldAnnotationDropped', {
          sourceField: event.data,
          editor: activeEditor,
          coordinates: { pos: event.pmPosition },
        });
      },
    });
  }

  /**
   * Focus the editor after image selection and schedule selection update.
   * This method encapsulates the common focus and blur logic used when
   * selecting both inline and block images.
   * @private
   * @returns {void}
   */
  #focusEditorAfterImageSelection(): void {
    this.#scheduleSelectionUpdate();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const editorDom = this.#editor.view?.dom as HTMLElement | undefined;
    if (editorDom) {
      editorDom.focus();
      this.#editor.view?.focus();
    }
  }

  #setupInputBridge() {
    this.#inputBridge?.destroy();
    // Pass both window (for keyboard events that bubble) and visibleHost (for beforeinput events that don't)
    const win = this.#visibleHost.ownerDocument?.defaultView ?? window;
    this.#inputBridge = new PresentationInputBridge(
      win as Window,
      this.#visibleHost,
      () => this.#getActiveDomTarget(),
      () => this.#documentMode !== 'viewing',
    );
    this.#inputBridge.bind();
  }

  #initHeaderFooterRegistry() {
    const startTime = performance.now();

    this.#headerFooterManagerCleanups.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.warn('[PresentationEditor] Header/footer cleanup failed:', error);
      }
    });
    this.#headerFooterManagerCleanups = [];
    this.#headerFooterAdapter?.clear();
    this.#headerFooterManager?.destroy();
    this.#overlayManager?.destroy();
    this.#session = { mode: 'body' };
    this.#activeHeaderFooterEditor = null;
    this.#inputBridge?.notifyTargetChanged();

    // Initialize EditorOverlayManager for in-place editing
    this.#overlayManager = new EditorOverlayManager(this.#painterHost, this.#visibleHost, this.#selectionOverlay);
    // Set callback for when user clicks on dimming overlay to exit edit mode
    this.#overlayManager.setOnDimmingClick(() => {
      this.#exitHeaderFooterMode();
    });

    const converter = (this.#editor as Editor & { converter?: unknown }).converter;
    this.#headerFooterIdentifier = extractIdentifierFromConverter(converter);
    this.#headerFooterManager = new HeaderFooterEditorManager(this.#editor);

    const optionsMedia = (this.#options as { mediaFiles?: Record<string, unknown> })?.mediaFiles;
    const storageMedia = (this.#editor as Editor & { storage?: { image?: { media?: Record<string, unknown> } } })
      .storage?.image?.media;
    const mediaFiles = optionsMedia ?? storageMedia;

    this.#headerFooterAdapter = new HeaderFooterLayoutAdapter(
      this.#headerFooterManager,
      mediaFiles as Record<string, string> | undefined,
    );
    const handleContentChange = ({ descriptor }: { descriptor: HeaderFooterDescriptor }) => {
      this.#headerFooterAdapter?.invalidate(descriptor.id);
      this.#pendingDocChange = true;
      this.#scheduleRerender();
    };
    this.#headerFooterManager.on('contentChanged', handleContentChange);
    this.#headerFooterManagerCleanups.push(() => {
      this.#headerFooterManager?.off('contentChanged', handleContentChange);
    });

    const duration = performance.now() - startTime;
    if (this.#options.isDebug && duration > HEADER_FOOTER_INIT_BUDGET_MS) {
      console.warn(
        `[PresentationEditor] Header/footer initialization took ${duration.toFixed(2)}ms (budget: ${HEADER_FOOTER_INIT_BUDGET_MS}ms)`,
      );
      // TODO: Consider showing loading spinner if bootstrap exceeds budget in production
      // to provide user feedback during long initialization times
    }
  }

  #handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    // Check if clicking on a draggable field annotation - if so, don't preventDefault
    // to allow native HTML5 drag-and-drop to work (mousedown must fire for dragstart)
    const target = event.target as HTMLElement;

    // Handle clicks on links in the layout engine
    const linkEl = target?.closest?.('a.superdoc-link') as HTMLAnchorElement | null;
    if (linkEl) {
      const href = linkEl.getAttribute('href') ?? '';
      const isAnchorLink = href.startsWith('#') && href.length > 1;
      const isTocLink = linkEl.closest('.superdoc-toc-entry') !== null;

      if (isAnchorLink && isTocLink) {
        // TOC entry anchor links: navigate to the anchor
        event.preventDefault();
        event.stopPropagation();
        this.goToAnchor(href);
        return;
      }

      // Non-TOC links: dispatch custom event to show the link popover
      // We dispatch from pointerdown because the DOM may be re-rendered before click fires,
      // which would cause the click event to land on the wrong element
      event.preventDefault();
      event.stopPropagation();

      const linkClickEvent = new CustomEvent('superdoc-link-click', {
        bubbles: true,
        composed: true,
        detail: {
          href: href,
          target: linkEl.getAttribute('target'),
          rel: linkEl.getAttribute('rel'),
          tooltip: linkEl.getAttribute('title'),
          element: linkEl,
          clientX: event.clientX,
          clientY: event.clientY,
        },
      });
      linkEl.dispatchEvent(linkClickEvent);
      return;
    }
    const isDraggableAnnotation = target?.closest?.('[data-draggable="true"]') != null;

    if (!this.#layoutState.layout) {
      // Layout not ready yet, but still focus the editor and set cursor to start
      // so the user can immediately begin typing
      if (!isDraggableAnnotation) {
        event.preventDefault();
      }

      // Blur any currently focused element
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      const editorDom = this.#editor.view?.dom as HTMLElement | undefined;
      if (!editorDom) {
        return;
      }

      // Find the first valid text position in the document
      const validPos = this.#getFirstTextPosition();
      const doc = this.#editor?.state?.doc;

      if (doc) {
        try {
          const tr = this.#editor.state.tr.setSelection(TextSelection.create(doc, validPos));
          this.#editor.view?.dispatch(tr);
        } catch (error) {
          // Error dispatching selection - this can happen if the document is in an invalid state
          if (process.env.NODE_ENV === 'development') {
            console.warn('[PresentationEditor] Failed to set selection to first text position:', error);
          }
        }
      }

      // Focus the hidden editor
      editorDom.focus();
      this.#editor.view?.focus();
      // Force selection update to render the caret
      this.#scheduleSelectionUpdate();

      return;
    }

    const rect = this.#viewportHost.getBoundingClientRect();
    // Use effective zoom from actual rendered dimensions for accurate coordinate conversion
    const zoom = this.#layoutOptions.zoom ?? 1;
    const scrollLeft = this.#visibleHost.scrollLeft ?? 0;
    const scrollTop = this.#visibleHost.scrollTop ?? 0;
    const x = (event.clientX - rect.left + scrollLeft) / zoom;
    const y = (event.clientY - rect.top + scrollTop) / zoom;

    // Exit header/footer mode if clicking outside the current region
    if (this.#session.mode !== 'body') {
      // Check if click is inside the active editor host element (more reliable than coordinate hit testing)
      const activeEditorHost = this.#overlayManager?.getActiveEditorHost?.();
      const clickedInsideEditorHost =
        activeEditorHost && (activeEditorHost.contains(event.target as Node) || activeEditorHost === event.target);

      if (clickedInsideEditorHost) {
        // Clicked within the active editor host - let the editor handle it, don't interfere
        return;
      }

      // Fallback: use coordinate-based hit testing
      const headerFooterRegion = this.#hitTestHeaderFooterRegion(x, y);
      if (!headerFooterRegion) {
        // Clicked outside header/footer region - exit mode and continue to position cursor in body
        this.#exitHeaderFooterMode();
        // Fall through to body click handling below
      } else {
        // Clicked within header/footer region but not in editor host - still let editor handle it
        return;
      }
    }

    const headerFooterRegion = this.#hitTestHeaderFooterRegion(x, y);
    if (headerFooterRegion) {
      // Header/footer mode will be handled via double-click; ignore single clicks for now.
      return;
    }

    const rawHit = clickToPosition(
      this.#layoutState.layout,
      this.#layoutState.blocks,
      this.#layoutState.measures,
      { x, y },
      this.#viewportHost,
      event.clientX,
      event.clientY,
    );

    // Clamp hit position to valid document bounds to handle stale layout data
    // (e.g., after drag-drop moves content, layout may briefly have old positions)
    const doc = this.#editor.state?.doc;
    const hit = rawHit && doc ? { ...rawHit, pos: Math.max(0, Math.min(rawHit.pos, doc.content.size)) } : rawHit;

    // Don't preventDefault for draggable annotations - allows mousedown to fire for native drag
    if (!isDraggableAnnotation) {
      event.preventDefault();
    }

    // Even if clickToPosition returns null (clicked outside text content),
    // we still want to focus the editor so the user can start typing
    if (!hit) {
      // Blur any currently focused element
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      const editorDom = this.#editor.view?.dom as HTMLElement | undefined;
      if (editorDom) {
        // Find the first valid text position in the document
        const validPos = this.#getFirstTextPosition();
        const doc = this.#editor?.state?.doc;

        if (doc) {
          try {
            const tr = this.#editor.state.tr.setSelection(TextSelection.create(doc, validPos));
            this.#editor.view?.dispatch(tr);
          } catch (error) {
            // Error dispatching selection - this can happen if the document is in an invalid state
            if (process.env.NODE_ENV === 'development') {
              console.warn('[PresentationEditor] Failed to set selection to first text position:', error);
            }
          }
        }
        editorDom.focus();
        this.#editor.view?.focus();
        // Force selection update to render the caret
        this.#scheduleSelectionUpdate();
      }
      return;
    }

    // Check if click landed on an atomic fragment (image, drawing)
    const fragmentHit = getFragmentAtPosition(
      this.#layoutState.layout,
      this.#layoutState.blocks,
      this.#layoutState.measures,
      hit.pos,
    );

    // Inline image hit detection via DOM target (for inline images rendered inside paragraphs)
    const targetImg = (event.target as HTMLElement | null)?.closest?.('img');
    const imgPmStart = targetImg?.dataset?.pmStart ? Number(targetImg.dataset.pmStart) : null;
    if (!Number.isNaN(imgPmStart) && imgPmStart != null) {
      const doc = this.#editor.state.doc;

      // Validate position is within document bounds
      if (imgPmStart < 0 || imgPmStart >= doc.content.size) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[PresentationEditor] Invalid position ${imgPmStart} for inline image (document size: ${doc.content.size})`,
          );
        }
        return;
      }

      // Emit imageDeselected if previous selection was a different image
      const newSelectionId = `inline-${imgPmStart}`;
      if (this.#lastSelectedImageBlockId && this.#lastSelectedImageBlockId !== newSelectionId) {
        this.emit('imageDeselected', { blockId: this.#lastSelectedImageBlockId } as ImageDeselectedEvent);
      }

      try {
        const tr = this.#editor.state.tr.setSelection(NodeSelection.create(doc, imgPmStart));
        this.#editor.view?.dispatch(tr);

        const selector = `.superdoc-inline-image[data-pm-start="${imgPmStart}"]`;
        const targetElement = this.#viewportHost.querySelector(selector);
        this.emit('imageSelected', {
          element: targetElement ?? targetImg,
          blockId: null,
          pmStart: imgPmStart,
        } as ImageSelectedEvent);
        this.#lastSelectedImageBlockId = newSelectionId;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[PresentationEditor] Failed to create NodeSelection for inline image at position ${imgPmStart}:`,
            error,
          );
        }
      }

      this.#focusEditorAfterImageSelection();
      return;
    }

    // If clicked on an atomic fragment (image or drawing), create NodeSelection
    if (fragmentHit && (fragmentHit.fragment.kind === 'image' || fragmentHit.fragment.kind === 'drawing')) {
      const doc = this.#editor.state.doc;
      try {
        // Create NodeSelection for atomic node at hit position
        const tr = this.#editor.state.tr.setSelection(NodeSelection.create(doc, hit.pos));
        this.#editor.view?.dispatch(tr);

        // Emit imageDeselected if previous selection was a different image
        if (this.#lastSelectedImageBlockId && this.#lastSelectedImageBlockId !== fragmentHit.fragment.blockId) {
          this.emit('imageDeselected', { blockId: this.#lastSelectedImageBlockId } as ImageDeselectedEvent);
        }

        // Emit imageSelected event for overlay to detect
        if (fragmentHit.fragment.kind === 'image') {
          const targetElement = this.#viewportHost.querySelector(
            `.superdoc-image-fragment[data-pm-start="${fragmentHit.fragment.pmStart}"]`,
          );
          if (targetElement) {
            this.emit('imageSelected', {
              element: targetElement,
              blockId: fragmentHit.fragment.blockId,
              pmStart: fragmentHit.fragment.pmStart,
            } as ImageSelectedEvent);
            this.#lastSelectedImageBlockId = fragmentHit.fragment.blockId;
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PresentationEditor] Failed to create NodeSelection for atomic fragment:', error);
        }
      }

      this.#focusEditorAfterImageSelection();
      return;
    }

    // If clicking away from an image, emit imageDeselected
    if (this.#lastSelectedImageBlockId) {
      this.emit('imageDeselected', { blockId: this.#lastSelectedImageBlockId } as ImageDeselectedEvent);
      this.#lastSelectedImageBlockId = null;
    }

    // Handle shift+click to extend selection
    if (event.shiftKey && this.#editor.state.selection.$anchor) {
      const anchor = this.#editor.state.selection.anchor;
      const head = hit.pos;

      // Use current extension mode (from previous double/triple click) or default to character mode
      const { selAnchor, selHead } = this.#calculateExtendedSelection(anchor, head, this.#dragExtensionMode);

      try {
        const tr = this.#editor.state.tr.setSelection(TextSelection.create(this.#editor.state.doc, selAnchor, selHead));
        this.#editor.view?.dispatch(tr);
        this.#scheduleSelectionUpdate();
      } catch (error) {
        console.warn('[SELECTION] Failed to extend selection on shift+click:', {
          error,
          anchor,
          head,
          selAnchor,
          selHead,
          mode: this.#dragExtensionMode,
        });
      }

      // Focus editor
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const editorDom = this.#editor.view?.dom as HTMLElement | undefined;
      if (editorDom) {
        editorDom.focus();
        this.#editor.view?.focus();
      }

      return; // Don't start drag on shift+click
    }

    const clickDepth = this.#registerPointerClick(event);

    // Set up drag selection state
    // Only update dragAnchor on single click; preserve it for double/triple clicks
    // so word/paragraph selection uses the consistent first-click position
    // (the second click can return a slightly different position due to mouse movement)
    if (clickDepth === 1) {
      this.#dragAnchor = hit.pos;

      // Check if click is inside a table cell for potential cell selection
      // Only set up cell anchor on single click (not double/triple for word/para selection)
      const tableHit = this.#hitTestTable(x, y);

      if (tableHit) {
        const tablePos = this.#getTablePosFromHit(tableHit);
        if (tablePos !== null) {
          this.#setCellAnchor(tableHit, tablePos);
        }
      } else {
        // Clicked outside table - clear any existing cell anchor
        this.#clearCellAnchor();
      }
    }
    this.#isDragging = true;
    if (clickDepth >= 3) {
      this.#dragExtensionMode = 'para';
    } else if (clickDepth === 2) {
      this.#dragExtensionMode = 'word';
    } else {
      this.#dragExtensionMode = 'char';
    }

    // Capture pointer for reliable drag tracking even outside viewport
    // Guard for test environments where setPointerCapture may not exist
    if (typeof this.#viewportHost.setPointerCapture === 'function') {
      this.#viewportHost.setPointerCapture(event.pointerId);
    }

    let handledByDepth = false;
    if (this.#session.mode === 'body') {
      // For double/triple clicks, use the stored dragAnchor from the first click
      // to avoid position drift from slight mouse movement between clicks
      const selectionPos = clickDepth >= 2 && this.#dragAnchor !== null ? this.#dragAnchor : hit.pos;

      if (clickDepth >= 3) {
        handledByDepth = this.#selectParagraphAt(selectionPos);
      } else if (clickDepth === 2) {
        handledByDepth = this.#selectWordAt(selectionPos);
      }
    }

    if (!handledByDepth) {
      try {
        const tr = this.#editor.state.tr.setSelection(TextSelection.create(this.#editor.state.doc, hit.pos));
        this.#editor.view?.dispatch(tr);
      } catch {
        // Position may be invalid during layout updates (e.g., after drag-drop) - ignore
      }
    }

    // Force selection update to clear stale carets even if PM thinks selection didn't change.
    // This handles clicking at/near same position where PM's selection.eq() might return true,
    // which prevents 'selectionUpdate' event from firing and leaves old carets on screen.
    // By forcing the update, we ensure #updateSelection() runs and clears the DOM layer.
    this.#scheduleSelectionUpdate();

    // Blur any currently focused element to ensure the PM editor can receive focus
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const editorDom = this.#editor.view?.dom as HTMLElement | undefined;
    if (!editorDom) {
      return;
    }

    // Try direct DOM focus first
    editorDom.focus();
    this.#editor.view?.focus();
  };

  /**
   * Finds the first valid text position in the document.
   *
   * Traverses the document tree to locate the first textblock node (paragraph, heading, etc.)
   * and returns a position inside it. This is used when focusing the editor but no specific
   * position is available (e.g., clicking outside text content or before layout is ready).
   *
   * @returns The position inside the first textblock, or 1 if no textblock is found
   * @private
   */
  #getFirstTextPosition(): number {
    const doc = this.#editor?.state?.doc;
    if (!doc || !doc.content) {
      return 1; // Fallback to position 1 if doc is not available
    }

    let validPos = 1; // Default to position 1 (after doc open tag)

    doc.nodesBetween(0, doc.content.size, (node, pos) => {
      if (node.isTextblock) {
        validPos = pos + 1; // Position inside the textblock
        return false; // Stop iteration
      }
      return true; // Continue searching
    });

    return validPos;
  }

  /**
   * Registers a pointer click event and tracks multi-click sequences (double, triple).
   *
   * This method implements multi-click detection by tracking the timing and position
   * of consecutive clicks. Clicks within 400ms and 5px of each other increment the
   * click count, up to a maximum of 3 (single, double, triple).
   *
   * @param event - The mouse event from the pointer down handler
   * @returns The current click count (1 = single, 2 = double, 3 = triple)
   * @private
   */
  #registerPointerClick(event: MouseEvent): number {
    const MAX_CLICK_COUNT = 3;

    const time = event.timeStamp ?? performance.now();
    const timeDelta = time - this.#lastClickTime;
    const withinTime = timeDelta <= MULTI_CLICK_TIME_THRESHOLD_MS;
    const distanceX = Math.abs(event.clientX - this.#lastClickPosition.x);
    const distanceY = Math.abs(event.clientY - this.#lastClickPosition.y);
    const withinDistance =
      distanceX <= MULTI_CLICK_DISTANCE_THRESHOLD_PX && distanceY <= MULTI_CLICK_DISTANCE_THRESHOLD_PX;

    if (withinTime && withinDistance) {
      this.#clickCount = Math.min(this.#clickCount + 1, MAX_CLICK_COUNT);
    } else {
      this.#clickCount = 1;
    }

    this.#lastClickTime = time;
    this.#lastClickPosition = { x: event.clientX, y: event.clientY };

    return this.#clickCount;
  }

  // ============================================================================
  // Cell Selection Utilities
  // ============================================================================

  /**
   * Gets the ProseMirror position at the start of a table cell from a table hit result.
   *
   * This method navigates the ProseMirror document structure to find the exact position where
   * a table cell begins. The position returned is suitable for use with CellSelection.create().
   *
   * Algorithm:
   * 1. Validate input (tableHit structure and cell indices)
   * 2. Traverse document to find the table node matching tableHit.block.id
   * 3. Navigate through table structure (table > row > cell) to target row
   * 4. Track logical column position accounting for colspan (handles merged cells)
   * 5. Return position when target column falls within a cell's span
   *
   * Merged cell handling:
   * - Does NOT assume 1:1 mapping between cell index and logical column
   * - Tracks cumulative logical column position by summing colspan values
   * - A cell with colspan=3 occupies logical columns [n, n+1, n+2]
   * - Finds the cell whose logical span contains the target column index
   *
   * Error handling:
   * - Input validation with console warnings for debugging
   * - Try-catch around document traversal (catches corrupted document errors)
   * - Bounds checking for row indices
   * - Null checks at each navigation step
   *
   * @param tableHit - The table hit result from hitTestTableFragment containing:
   *   - block: TableBlock with the table's block ID
   *   - cellRowIndex: 0-based row index of the target cell
   *   - cellColIndex: 0-based logical column index of the target cell
   * @returns The PM position at the start of the cell, or null if:
   *   - Invalid input (null tableHit, negative indices)
   *   - Table not found in document
   *   - Target row out of bounds
   *   - Target column not found in row
   *   - Document traversal error
   * @private
   *
   * @throws Never throws - all errors are caught and logged, returns null on failure
   */
  #getCellPosFromTableHit(tableHit: TableHitResult): number | null {
    // Input validation: Check for valid tableHit structure
    if (!tableHit || !tableHit.block || typeof tableHit.block.id !== 'string') {
      console.warn('[getCellPosFromTableHit] Invalid tableHit input:', tableHit);
      return null;
    }

    // Validate cell indices are non-negative
    if (
      typeof tableHit.cellRowIndex !== 'number' ||
      typeof tableHit.cellColIndex !== 'number' ||
      tableHit.cellRowIndex < 0 ||
      tableHit.cellColIndex < 0
    ) {
      console.warn('[getCellPosFromTableHit] Invalid cell indices:', {
        row: tableHit.cellRowIndex,
        col: tableHit.cellColIndex,
      });
      return null;
    }

    const doc = this.#editor.state?.doc;
    if (!doc) return null;

    // Find the table node in the document by searching for the block ID
    // Get table blocks only and find the index of the target table
    const tableBlocks = this.#layoutState.blocks.filter((b) => b.kind === 'table');
    const targetTableIndex = tableBlocks.findIndex((b) => b.id === tableHit.block.id);
    if (targetTableIndex === -1) return null;

    let tablePos: number | null = null;
    let currentTableIndex = 0;

    try {
      doc.descendants((node, pos) => {
        if (node.type.name === 'table') {
          if (currentTableIndex === targetTableIndex) {
            tablePos = pos;
            return false; // Stop iteration
          }
          currentTableIndex++;
        }
        return true;
      });
    } catch (error: unknown) {
      console.error('[getCellPosFromTableHit] Error during document traversal:', error);
      return null;
    }

    if (tablePos === null) return null;

    const tableNode = doc.nodeAt(tablePos);
    if (!tableNode || tableNode.type.name !== 'table') return null;

    // Navigate to the specific cell
    const targetRowIndex = tableHit.cellRowIndex;
    const targetColIndex = tableHit.cellColIndex;

    // Bounds check: Validate target row exists in table
    if (targetRowIndex >= tableNode.childCount) {
      console.warn('[getCellPosFromTableHit] Target row index out of bounds:', {
        targetRowIndex,
        tableChildCount: tableNode.childCount,
      });
      return null;
    }

    // Calculate position by traversing table structure
    // Table structure: table > tableRow > tableCell
    let currentPos = tablePos + 1; // +1 to enter the table node

    // Iterate through rows to find the target row
    for (let r = 0; r < tableNode.childCount && r <= targetRowIndex; r++) {
      const row = tableNode.child(r);
      if (r === targetRowIndex) {
        // Found the target row, now find the cell
        currentPos += 1; // +1 to enter the row node

        // Track logical column position accounting for colspan
        let logicalCol = 0;
        for (let cellIndex = 0; cellIndex < row.childCount; cellIndex++) {
          const cell = row.child(cellIndex);
          // Type guard: Validate colspan is a positive number
          const rawColspan = cell.attrs?.colspan;
          const colspan =
            typeof rawColspan === 'number' && Number.isFinite(rawColspan) && rawColspan > 0 ? rawColspan : 1;

          // Check if target column falls within this cell's span
          if (targetColIndex >= logicalCol && targetColIndex < logicalCol + colspan) {
            // Found the target cell - return position at cell start
            return currentPos;
          }

          // Move past this cell
          currentPos += cell.nodeSize;
          logicalCol += colspan;
        }

        // Target column not found in this row (shouldn't happen in valid tables)
        console.warn('[getCellPosFromTableHit] Target column not found in row:', {
          targetColIndex,
          logicalColReached: logicalCol,
          rowCellCount: row.childCount,
        });
        return null;
      } else {
        // Move past this row
        currentPos += row.nodeSize;
      }
    }

    return null;
  }

  /**
   * Gets the table position (start of table node) from a table hit result.
   *
   * @param tableHit - The table hit result from hitTestTableFragment
   * @returns The PM position at the start of the table, or null if not found
   * @private
   */
  #getTablePosFromHit(tableHit: TableHitResult): number | null {
    const doc = this.#editor.state?.doc;
    if (!doc) return null;

    // Get table blocks only and find the index of the target table
    const tableBlocks = this.#layoutState.blocks.filter((b) => b.kind === 'table');
    const targetTableIndex = tableBlocks.findIndex((b) => b.id === tableHit.block.id);
    if (targetTableIndex === -1) return null;

    let tablePos: number | null = null;
    let currentTableIndex = 0;

    doc.descendants((node, pos) => {
      if (node.type.name === 'table') {
        if (currentTableIndex === targetTableIndex) {
          tablePos = pos;
          return false;
        }
        currentTableIndex++;
      }
      return true;
    });

    return tablePos;
  }

  /**
   * Determines if the current drag should create a CellSelection instead of TextSelection.
   *
   * Implements a state machine for table cell selection:
   * - 'none': Not in a table, use TextSelection
   * - 'pending': Started drag in a table, but haven't crossed cell boundary yet
   * - 'active': Crossed cell boundary, use CellSelection
   *
   * State transitions:
   * - none → pending: When drag starts in a table cell (#setCellAnchor)
   * - pending → active: When drag crosses into a different cell (this method returns true)
   * - active → none: When drag ends (#clearCellAnchor)
   * - * → none: When document changes or clicking outside table
   *
   * Decision logic:
   * 1. No cell anchor → false (not in table drag mode)
   * 2. Current position outside table → return current state (stay in 'active' if already there)
   * 3. Different table → treat as outside table
   * 4. Different cell in same table → true (activate cell selection)
   * 5. Same cell → return current state (stay in 'active' if already there, else false)
   *
   * This state machine ensures:
   * - Text selection works normally within a single cell
   * - Cell selection activates smoothly when crossing cell boundaries
   * - Once activated, cell selection persists even if dragging back to anchor cell
   *
   * @param currentTableHit - The table hit result for the current pointer position, or null if not in a table
   * @returns true if we should create a CellSelection, false for TextSelection
   * @private
   */
  #shouldUseCellSelection(currentTableHit: TableHitResult | null): boolean {
    // No cell anchor means we didn't start in a table
    if (!this.#cellAnchor) return false;

    // Current position is outside any table - keep last cell selection
    if (!currentTableHit) return this.#cellDragMode === 'active';

    // Check if we're in the same table
    if (currentTableHit.block.id !== this.#cellAnchor.tableBlockId) {
      // Different table - treat as outside table
      return this.#cellDragMode === 'active';
    }

    // Check if we've crossed a cell boundary
    const sameCell =
      currentTableHit.cellRowIndex === this.#cellAnchor.cellRowIndex &&
      currentTableHit.cellColIndex === this.#cellAnchor.cellColIndex;

    if (!sameCell) {
      // We've crossed into a different cell - activate cell selection
      return true;
    }

    // Same cell - only use cell selection if we were already in active mode
    return this.#cellDragMode === 'active';
  }

  /**
   * Stores the cell anchor when a drag operation starts inside a table cell.
   *
   * @param tableHit - The table hit result for the initial click position
   * @param tablePos - The PM position of the table node
   * @private
   */
  #setCellAnchor(tableHit: TableHitResult, tablePos: number): void {
    const cellPos = this.#getCellPosFromTableHit(tableHit);
    if (cellPos === null) {
      return;
    }

    this.#cellAnchor = {
      tablePos,
      cellPos,
      cellRowIndex: tableHit.cellRowIndex,
      cellColIndex: tableHit.cellColIndex,
      tableBlockId: tableHit.block.id,
    };
    this.#cellDragMode = 'pending';
  }

  /**
   * Clears the cell drag state.
   * Called when drag ends or when clicking outside a table.
   *
   * @private
   */
  #clearCellAnchor(): void {
    this.#cellAnchor = null;
    this.#cellDragMode = 'none';
  }

  /**
   * Attempts to perform a table hit test for the given normalized coordinates.
   *
   * @param normalizedX - X coordinate in layout space
   * @param normalizedY - Y coordinate in layout space
   * @returns TableHitResult if the point is inside a table cell, null otherwise
   * @private
   */
  #hitTestTable(normalizedX: number, normalizedY: number): TableHitResult | null {
    if (!this.#layoutState.layout) {
      return null;
    }

    // Find the page at these coordinates
    const layout = this.#layoutState.layout;
    // Get configured page size as fallback (page.size may be undefined for single-section docs)
    const configuredPageSize = this.#layoutOptions.pageSize ?? DEFAULT_PAGE_SIZE;

    let pageY = 0;
    let pageHit: PageHit | null = null;

    for (let i = 0; i < layout.pages.length; i++) {
      const page = layout.pages[i];
      // Use page.size.h if available, otherwise fall back to configured page size
      const pageHeight = page.size?.h ?? configuredPageSize.h;
      const gap = this.#layoutOptions.virtualization?.gap ?? DEFAULT_PAGE_GAP;

      if (normalizedY >= pageY && normalizedY < pageY + pageHeight) {
        pageHit = { pageIndex: i, page };
        break;
      }
      pageY += pageHeight + gap;
    }

    if (!pageHit) {
      return null;
    }

    // Convert to page-relative coordinates
    const pageRelativeY = normalizedY - pageY;
    const point = { x: normalizedX, y: pageRelativeY };

    return hitTestTableFragment(pageHit, this.#layoutState.blocks, this.#layoutState.measures, point);
  }

  /**
   * Selects the word at the given document position.
   *
   * This method traverses up the document tree to find the nearest textblock ancestor,
   * then expands the selection to word boundaries using Unicode-aware word character
   * detection. This handles cases where the position is within nested structures like
   * list items or table cells.
   *
   * Algorithm:
   * 1. Traverse ancestors until a textblock is found (paragraphs, headings, list items)
   * 2. From the click position, expand backward while characters match word regex
   * 3. Expand forward while characters match word regex
   * 4. Create a text selection spanning the word boundaries
   *
   * @param pos - The absolute document position where the double-click occurred
   * @returns true if a word was selected successfully, false otherwise
   * @private
   */
  #selectWordAt(pos: number): boolean {
    const state = this.#editor.state;
    if (!state?.doc) {
      return false;
    }

    // Validate position bounds before resolving
    if (pos < 0 || pos > state.doc.content.size) {
      return false;
    }

    const $pos = state.doc.resolve(pos);

    // Find the nearest textblock ancestor (may not be the immediate parent)
    let textblockPos = $pos;
    while (textblockPos.depth > 0) {
      if (textblockPos.parent?.isTextblock) {
        break;
      }
      // Safety check: ensure we can traverse up
      if (!textblockPos.parent || textblockPos.depth === 0) {
        break;
      }
      const beforePos = textblockPos.before();
      // Validate position is in document range
      if (beforePos < 0 || beforePos > state.doc.content.size) {
        return false;
      }
      textblockPos = state.doc.resolve(beforePos);
    }

    if (!textblockPos.parent?.isTextblock) {
      return false;
    }

    const parentStart = textblockPos.start();
    const parentEnd = textblockPos.end();

    let startPos = pos;
    while (startPos > parentStart) {
      const prevChar = state.doc.textBetween(startPos - 1, startPos, '\u0000', '\u0000');
      if (!this.#isWordCharacter(prevChar)) {
        break;
      }
      startPos -= 1;
    }

    let endPos = pos;
    while (endPos < parentEnd) {
      const nextChar = state.doc.textBetween(endPos, endPos + 1, '\u0000', '\u0000');
      if (!this.#isWordCharacter(nextChar)) {
        break;
      }
      endPos += 1;
    }

    if (startPos === endPos) {
      return false;
    }

    const tr = state.tr.setSelection(TextSelection.create(state.doc, startPos, endPos));
    try {
      this.#editor.view?.dispatch(tr);
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PresentationEditor] Failed to select word:', error);
      }
      return false;
    }
  }

  /**
   * Selects the entire paragraph (textblock) at the given document position.
   *
   * This method traverses up the document tree to find the nearest textblock ancestor,
   * then selects from its start to end position. This handles cases where the position
   * is within nested structures like list items or table cells.
   *
   * Algorithm:
   * 1. Traverse ancestors until a textblock is found (paragraphs, headings, list items)
   * 2. Select from textblock.start() to textblock.end()
   *
   * @param pos - The absolute document position where the triple-click occurred
   * @returns true if a paragraph was selected successfully, false otherwise
   * @private
   */
  #selectParagraphAt(pos: number): boolean {
    const state = this.#editor.state;
    if (!state?.doc) {
      return false;
    }
    const $pos = state.doc.resolve(pos);

    // Find the nearest textblock ancestor (may not be the immediate parent)
    let textblockPos = $pos;
    while (textblockPos.depth > 0) {
      if (textblockPos.parent?.isTextblock) {
        break;
      }
      // Safety check: ensure we can traverse up
      if (!textblockPos.parent || textblockPos.depth === 0) {
        break;
      }
      const beforePos = textblockPos.before();
      // Validate position is in document range
      if (beforePos < 0 || beforePos > state.doc.content.size) {
        return false;
      }
      textblockPos = state.doc.resolve(beforePos);
    }

    if (!textblockPos.parent?.isTextblock) {
      return false;
    }

    const from = textblockPos.start();
    const to = textblockPos.end();
    const tr = state.tr.setSelection(TextSelection.create(state.doc, from, to));
    try {
      this.#editor.view?.dispatch(tr);
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PresentationEditor] Failed to select paragraph:', error);
      }
      return false;
    }
  }

  /**
   * Calculates extended selection boundaries based on the current extension mode.
   *
   * This helper method consolidates the logic for extending selections to word or paragraph
   * boundaries, used by both shift+click and drag selection handlers. It preserves selection
   * directionality by placing the head on the side where the user is clicking/dragging.
   *
   * @param anchor - The anchor position of the selection (fixed point)
   * @param head - The head position of the selection (moving point)
   * @param mode - The extension mode: 'char' (no extension), 'word', or 'para'
   * @returns Object with selAnchor and selHead positions after applying extension
   * @private
   */
  #calculateExtendedSelection(
    anchor: number,
    head: number,
    mode: 'char' | 'word' | 'para',
  ): { selAnchor: number; selHead: number } {
    if (mode === 'word') {
      const anchorBounds = findWordBoundaries(this.#layoutState.blocks, anchor);
      const headBounds = findWordBoundaries(this.#layoutState.blocks, head);
      if (anchorBounds && headBounds) {
        if (head >= anchor) {
          // Dragging/extending forward: anchor at start of anchor word, head at end of head word
          return { selAnchor: anchorBounds.from, selHead: headBounds.to };
        } else {
          // Dragging/extending backward: anchor at end of anchor word, head at start of head word
          return { selAnchor: anchorBounds.to, selHead: headBounds.from };
        }
      }
    } else if (mode === 'para') {
      const anchorBounds = findParagraphBoundaries(this.#layoutState.blocks, anchor);
      const headBounds = findParagraphBoundaries(this.#layoutState.blocks, head);
      if (anchorBounds && headBounds) {
        if (head >= anchor) {
          // Dragging/extending forward: anchor at start of anchor para, head at end of head para
          return { selAnchor: anchorBounds.from, selHead: headBounds.to };
        } else {
          // Dragging/extending backward: anchor at end of anchor para, head at start of head para
          return { selAnchor: anchorBounds.to, selHead: headBounds.from };
        }
      }
    }

    // Fallback to character mode (no extension) if boundaries not found or mode is 'char'
    return { selAnchor: anchor, selHead: head };
  }

  /**
   * Determines if a character is considered part of a word for selection purposes.
   *
   * Uses Unicode property escapes to match:
   * - Letters (\p{L}): All Unicode letter characters
   * - Numbers (\p{N}): All Unicode number characters
   * - Apostrophes (''): For contractions like "don't"
   * - Underscores (_): Common in identifiers
   * - Tildes (~), Hyphens (-): For hyphenated words
   *
   * @param char - A single character to test
   * @returns true if the character is part of a word, false otherwise
   * @private
   */
  #isWordCharacter(char: string): boolean {
    if (!char) {
      return false;
    }
    return WORD_CHARACTER_REGEX.test(char);
  }

  #handlePointerMove = (event: PointerEvent) => {
    if (!this.#layoutState.layout) return;
    const normalized = this.#normalizeClientPoint(event.clientX, event.clientY);
    if (!normalized) return;

    // Handle drag selection when button is held
    if (this.#isDragging && this.#dragAnchor !== null && event.buttons & 1) {
      const hit = clickToPosition(
        this.#layoutState.layout,
        this.#layoutState.blocks,
        this.#layoutState.measures,
        { x: normalized.x, y: normalized.y },
        this.#viewportHost,
        event.clientX,
        event.clientY,
      );

      // If we can't find a position, keep the last selection
      if (!hit) return;

      // Check for cell selection mode (table drag)
      const currentTableHit = this.#hitTestTable(normalized.x, normalized.y);
      const shouldUseCellSel = this.#shouldUseCellSelection(currentTableHit);

      if (shouldUseCellSel && this.#cellAnchor) {
        // Cell selection mode - create CellSelection spanning anchor to current cell
        const headCellPos = currentTableHit ? this.#getCellPosFromTableHit(currentTableHit) : null;

        if (headCellPos !== null) {
          // Transition to active mode if we weren't already
          if (this.#cellDragMode !== 'active') {
            this.#cellDragMode = 'active';
          }

          try {
            const doc = this.#editor.state.doc;
            const anchorCellPos = this.#cellAnchor.cellPos;

            // Validate positions are within document bounds
            const clampedAnchor = Math.max(0, Math.min(anchorCellPos, doc.content.size));
            const clampedHead = Math.max(0, Math.min(headCellPos, doc.content.size));

            const cellSelection = CellSelection.create(doc, clampedAnchor, clampedHead);
            const tr = this.#editor.state.tr.setSelection(cellSelection);
            this.#editor.view?.dispatch(tr);
            this.#scheduleSelectionUpdate();
          } catch (error) {
            // CellSelection creation can fail if positions are invalid
            // Fall back to text selection
            console.warn('[CELL-SELECTION] Failed to create CellSelection, falling back to TextSelection:', error);

            const anchor = this.#dragAnchor;
            const head = hit.pos;
            const { selAnchor, selHead } = this.#calculateExtendedSelection(anchor, head, this.#dragExtensionMode);

            try {
              const tr = this.#editor.state.tr.setSelection(
                TextSelection.create(this.#editor.state.doc, selAnchor, selHead),
              );
              this.#editor.view?.dispatch(tr);
              this.#scheduleSelectionUpdate();
            } catch {
              // Position may be invalid during layout updates - ignore
            }
          }

          return; // Skip header/footer hover logic during drag
        }
      }

      // Text selection mode (default)
      const anchor = this.#dragAnchor;
      const head = hit.pos;

      // Apply extension mode to expand selection boundaries, preserving direction
      const { selAnchor, selHead } = this.#calculateExtendedSelection(anchor, head, this.#dragExtensionMode);

      try {
        const tr = this.#editor.state.tr.setSelection(TextSelection.create(this.#editor.state.doc, selAnchor, selHead));
        this.#editor.view?.dispatch(tr);
        this.#scheduleSelectionUpdate();
      } catch (error) {
        console.warn('[SELECTION] Failed to extend selection during drag:', {
          error,
          anchor,
          head,
          selAnchor,
          selHead,
          mode: this.#dragExtensionMode,
        });
      }

      return; // Skip header/footer hover logic during drag
    }

    if (this.#session.mode !== 'body') {
      this.#clearHoverRegion();
      return;
    }
    const region = this.#hitTestHeaderFooterRegion(normalized.x, normalized.y);
    if (!region) {
      this.#clearHoverRegion();
      return;
    }
    if (
      this.#hoverRegion &&
      this.#hoverRegion.kind === region.kind &&
      this.#hoverRegion.pageIndex === region.pageIndex &&
      this.#hoverRegion.sectionType === region.sectionType
    ) {
      return;
    }
    this.#hoverRegion = region;
    this.#renderHoverRegion(region);
  };

  #handlePointerLeave = () => {
    this.#clearHoverRegion();
  };

  #handlePointerUp = (event: PointerEvent) => {
    if (!this.#isDragging) return;

    // Release pointer capture if we have it
    // Guard for test environments where pointer capture methods may not exist
    if (
      typeof this.#viewportHost.hasPointerCapture === 'function' &&
      typeof this.#viewportHost.releasePointerCapture === 'function' &&
      this.#viewportHost.hasPointerCapture(event.pointerId)
    ) {
      this.#viewportHost.releasePointerCapture(event.pointerId);
    }

    // Clear drag state - but preserve #dragAnchor and #dragExtensionMode
    // because they're needed for double-click word selection (the anchor from
    // the first click must persist to the second click) and for shift+click
    // to extend selection in the same mode (word/para) after a multi-click
    this.#isDragging = false;

    // Reset cell drag mode but preserve #cellAnchor for potential shift+click extension
    // If we were in active cell selection mode, the CellSelection is already dispatched
    // and preserved in the editor state
    if (this.#cellDragMode !== 'none') {
      this.#cellDragMode = 'none';
    }
  };

  /**
   * Handles dragover events for field annotation drag-and-drop operations.
   * Updates the cursor position during drag to provide visual feedback.
   *
   * @param event - The dragover event from the browser
   *
   * Side effects:
   * - Prevents default browser drag behavior
   * - Sets dropEffect to 'copy' to indicate the drag operation type
   * - Updates the editor's text selection to follow the drag cursor
   * - Triggers selection overlay updates via #scheduleSelectionUpdate
   *
   * Early returns:
   * - If the editor is not editable
   * - If no field annotation data is present in the drag
   * - If hit testing fails or document is unavailable
   * - If the cursor position hasn't changed
   */
  #handleDragOver = (event: DragEvent) => {
    const activeEditor = this.getActiveEditor();
    if (!activeEditor?.isEditable) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }

    const dt = event.dataTransfer;
    const hasFieldAnnotation =
      dt?.types?.includes(FIELD_ANNOTATION_DATA_TYPE) || Boolean(dt?.getData?.(FIELD_ANNOTATION_DATA_TYPE));
    if (!hasFieldAnnotation) {
      return;
    }

    const hit = this.hitTest(event.clientX, event.clientY);
    const doc = activeEditor.state?.doc;
    if (!hit || !doc) {
      return;
    }

    const pos = Math.min(Math.max(hit.pos, 1), doc.content.size);
    const currentSelection = activeEditor.state.selection;
    const isSameCursor =
      currentSelection instanceof TextSelection && currentSelection.from === pos && currentSelection.to === pos;

    if (isSameCursor) {
      return;
    }

    try {
      const tr = activeEditor.state.tr.setSelection(TextSelection.create(doc, pos)).setMeta('addToHistory', false);
      activeEditor.view?.dispatch(tr);
      this.#scheduleSelectionUpdate();
    } catch (error) {
      // Position may be invalid during layout updates - expected during re-layout
      if (process.env.NODE_ENV === 'development') {
        console.debug('[PresentationEditor] Drag position update skipped:', error);
      }
    }
  };

  /**
   * Handles drop events for field annotation drag-and-drop operations.
   * Inserts a field annotation at the drop position and emits events for tracking.
   *
   * @param event - The drop event from the browser
   *
   * Side effects:
   * - Prevents default browser drop behavior and stops event propagation
   * - Inserts a field annotation node at the drop position
   * - Moves the cursor to just after the inserted node
   * - Emits 'fieldAnnotationDropped' event with drop metadata
   * - Focuses the editor view
   * - Triggers selection overlay updates via #scheduleSelectionUpdate
   *
   * Early returns:
   * - If the editor is not editable
   * - If no field annotation data is present in the drop
   * - If JSON parsing of the payload fails
   * - If hit testing and fallback position both fail
   * - If the parsed attributes fail validation
   *
   * Fallback behavior:
   * - If hit testing fails (e.g., during a reflow), falls back to current selection position
   * - If selection is unavailable, falls back to end of document
   */
  #handleDrop = (event: DragEvent) => {
    const activeEditor = this.getActiveEditor();
    if (!activeEditor?.isEditable) {
      return;
    }

    // Internal layout-engine drags use a custom MIME type and are handled by #setupDragHandlers.
    if (event.dataTransfer?.types?.includes('application/x-field-annotation')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const fieldAnnotationData = event.dataTransfer?.getData(FIELD_ANNOTATION_DATA_TYPE);
    if (!fieldAnnotationData) {
      return;
    }

    const hit = this.hitTest(event.clientX, event.clientY);
    // If layout hit testing fails (e.g., during a reflow), fall back to the current selection.
    const selection = activeEditor.state?.selection;
    const fallbackPos = selection?.from ?? activeEditor.state?.doc?.content.size ?? null;
    const pos = hit?.pos ?? fallbackPos;
    if (pos == null) {
      return;
    }

    let parsedData: FieldAnnotationDragPayload | null = null;
    try {
      parsedData = JSON.parse(fieldAnnotationData) as FieldAnnotationDragPayload;
    } catch {
      return;
    }

    const { attributes, sourceField } = parsedData ?? {};

    activeEditor.emit?.('fieldAnnotationDropped', {
      sourceField,
      editor: activeEditor,
      coordinates: hit,
      pos,
    });

    // Validate attributes before attempting insertion
    if (attributes && isValidFieldAnnotationAttributes(attributes)) {
      activeEditor.commands?.addFieldAnnotation?.(pos, attributes, true);

      // Move the caret to just after the inserted node so subsequent drops append instead of replacing.
      const posAfter = Math.min(pos + 1, activeEditor.state?.doc?.content.size ?? pos + 1);
      const tr = activeEditor.state?.tr.setSelection(TextSelection.create(activeEditor.state.doc, posAfter));
      if (tr) {
        activeEditor.view?.dispatch(tr);
      }

      this.#scheduleSelectionUpdate();
    }

    const editorDom = activeEditor.view?.dom as HTMLElement | undefined;
    if (editorDom) {
      editorDom.focus();
      activeEditor.view?.focus();
    }
  };

  #handleDoubleClick = (event: MouseEvent) => {
    if (event.button !== 0) return;
    if (!this.#layoutState.layout) return;

    const rect = this.#viewportHost.getBoundingClientRect();
    // Use effective zoom from actual rendered dimensions for accurate coordinate conversion
    const zoom = this.#layoutOptions.zoom ?? 1;
    const scrollLeft = this.#visibleHost.scrollLeft ?? 0;
    const scrollTop = this.#visibleHost.scrollTop ?? 0;
    const x = (event.clientX - rect.left + scrollLeft) / zoom;
    const y = (event.clientY - rect.top + scrollTop) / zoom;

    const region = this.#hitTestHeaderFooterRegion(x, y);
    if (region) {
      event.preventDefault();
      event.stopPropagation();

      // Check if header/footer exists, create if not
      const descriptor = this.#resolveDescriptorForRegion(region);
      if (!descriptor && this.#headerFooterManager) {
        // No header/footer exists - create a default one
        this.#createDefaultHeaderFooter(region);
        // Refresh the manager to pick up the new descriptor
        this.#headerFooterManager.refresh();
      }

      this.#activateHeaderFooterRegion(region);
    } else if (this.#session.mode !== 'body') {
      this.#exitHeaderFooterMode();
    }
  };

  #handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.#session.mode !== 'body') {
      event.preventDefault();
      this.#exitHeaderFooterMode();
      return;
    }
    if (event.ctrlKey && event.altKey && !event.shiftKey) {
      if (event.code === 'KeyH') {
        event.preventDefault();
        this.#focusHeaderFooterShortcut('header');
      } else if (event.code === 'KeyF') {
        event.preventDefault();
        this.#focusHeaderFooterShortcut('footer');
      }
    }
  };

  #focusHeaderFooterShortcut(kind: 'header' | 'footer') {
    const pageIndex = this.#getCurrentPageIndex();
    const region = this.#findRegionForPage(kind, pageIndex);
    if (!region) {
      this.#emitHeaderFooterEditBlocked('missingRegion');
      return;
    }
    this.#activateHeaderFooterRegion(region);
  }

  #scheduleRerender() {
    if (this.#renderScheduled) {
      return;
    }
    this.#renderScheduled = true;
    const win = this.#visibleHost.ownerDocument?.defaultView ?? window;
    this.#rafHandle = win.requestAnimationFrame(() => {
      this.#renderScheduled = false;
      this.#flushRerenderQueue().catch((error) => {
        this.#handleLayoutError('render', error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  async #flushRerenderQueue() {
    if (this.#isRerendering) {
      this.#pendingDocChange = true;
      return;
    }
    if (!this.#pendingDocChange) {
      return;
    }
    this.#pendingDocChange = false;
    this.#isRerendering = true;
    try {
      await this.#rerender();
    } finally {
      this.#isRerendering = false;
      if (this.#pendingDocChange) {
        this.#scheduleRerender();
      }
    }
  }

  async #rerender() {
    let docJson;
    const viewWindow = this.#visibleHost.ownerDocument?.defaultView ?? window;
    const perf = viewWindow?.performance ?? GLOBAL_PERFORMANCE;
    const startMark = perf?.now?.();
    try {
      docJson = this.#editor.getJSON();
    } catch (error) {
      this.#handleLayoutError('render', this.#decorateError(error, 'getJSON'));
      return;
    }

    const sectionMetadata: SectionMetadata[] = [];
    let blocks: FlowBlock[] | undefined;
    let bookmarks: Map<string, number> = new Map();
    try {
      const converter = (this.#editor as Editor & { converter?: Record<string, unknown> }).converter;
      const converterContext = converter
        ? {
            docx: converter.convertedXml,
            numbering: converter.numbering,
            linkedStyles: converter.linkedStyles,
          }
        : undefined;
      const result = toFlowBlocks(docJson, {
        mediaFiles: this.#options.mediaFiles as Record<string, string> | undefined,
        emitSectionBreaks: true,
        sectionMetadata,
        trackedChangesMode: this.#trackedChangesMode,
        enableTrackedChanges: this.#trackedChangesEnabled,
        enableRichHyperlinks: true,
        themeColors: this.#editor?.converter?.themeColors ?? undefined,
        converterContext,
      });
      blocks = result.blocks;
      bookmarks = result.bookmarks ?? new Map();
    } catch (error) {
      this.#handleLayoutError('render', this.#decorateError(error, 'toFlowBlocks'));
      return;
    }

    if (!blocks) {
      this.#handleLayoutError('render', new Error('toFlowBlocks returned undefined blocks'));
      return;
    }

    const layoutOptions = this.#resolveLayoutOptions(blocks, sectionMetadata);
    const previousBlocks = this.#layoutState.blocks;
    const previousLayout = this.#layoutState.layout;

    let layout: Layout;
    let measures: Measure[];
    let headerLayouts: HeaderFooterLayoutResult[] | undefined;
    let footerLayouts: HeaderFooterLayoutResult[] | undefined;
    const headerFooterInput = this.#buildHeaderFooterInput();
    try {
      const result = await incrementalLayout(
        previousBlocks,
        previousLayout,
        blocks,
        layoutOptions,
        (block: FlowBlock, constraints: { maxWidth: number; maxHeight: number }) => measureBlock(block, constraints),
        headerFooterInput ?? undefined,
      );

      // Type guard: validate incrementalLayout return value
      if (!result || typeof result !== 'object') {
        this.#handleLayoutError('render', new Error('incrementalLayout returned invalid result'));
        return;
      }
      if (!result.layout || typeof result.layout !== 'object') {
        this.#handleLayoutError('render', new Error('incrementalLayout returned invalid layout'));
        return;
      }
      if (!Array.isArray(result.measures)) {
        this.#handleLayoutError('render', new Error('incrementalLayout returned invalid measures'));
        return;
      }

      ({ layout, measures } = result);
      // Add pageGap to layout for hit testing to account for gaps between rendered pages.
      // Gap depends on virtualization mode and must be non-negative.
      if (this.#layoutOptions.virtualization?.enabled) {
        const gap = this.#layoutOptions.virtualization.gap ?? DEFAULT_VIRTUALIZED_PAGE_GAP;
        layout.pageGap = Math.max(0, gap);
      } else {
        layout.pageGap = DEFAULT_PAGE_GAP;
      }
      headerLayouts = result.headers;
      footerLayouts = result.footers;
    } catch (error) {
      this.#handleLayoutError('render', this.#decorateError(error, 'incrementalLayout'));
      return;
    }

    this.#sectionMetadata = sectionMetadata;
    // Build multi-section identifier from section metadata for section-aware header/footer selection
    // Pass converter's headerIds/footerIds as fallbacks for dynamically created headers/footers
    const converter = (this.#editor as EditorWithConverter).converter;
    this.#multiSectionIdentifier = buildMultiSectionIdentifier(sectionMetadata, converter?.pageStyles, {
      headerIds: converter?.headerIds,
      footerIds: converter?.footerIds,
    });
    const anchorMap = this.#computeAnchorMap(bookmarks, layout);
    this.#layoutState = { blocks, measures, layout, bookmarks, anchorMap };
    this.#headerLayoutResults = headerLayouts ?? null;
    this.#footerLayoutResults = footerLayouts ?? null;

    // Process per-rId header/footer content for multi-section support
    await this.#layoutPerRIdHeaderFooters(headerFooterInput, layout, sectionMetadata);

    this.#updateDecorationProviders(layout);

    const painter = this.#ensurePainter(blocks, measures);
    if (typeof painter.setProviders === 'function') {
      painter.setProviders(this.#headerDecorationProvider, this.#footerDecorationProvider);
    }

    // Extract header/footer blocks and measures from layout results
    const headerBlocks: FlowBlock[] = [];
    const headerMeasures: Measure[] = [];
    if (headerLayouts) {
      for (const headerResult of headerLayouts) {
        headerBlocks.push(...headerResult.blocks);
        headerMeasures.push(...headerResult.measures);
      }
    }
    // Also include per-rId header blocks for multi-section support
    for (const rIdResult of this.#headerLayoutsByRId.values()) {
      headerBlocks.push(...rIdResult.blocks);
      headerMeasures.push(...rIdResult.measures);
    }

    const footerBlocks: FlowBlock[] = [];
    const footerMeasures: Measure[] = [];
    if (footerLayouts) {
      for (const footerResult of footerLayouts) {
        footerBlocks.push(...footerResult.blocks);
        footerMeasures.push(...footerResult.measures);
      }
    }
    // Also include per-rId footer blocks for multi-section support
    for (const rIdResult of this.#footerLayoutsByRId.values()) {
      footerBlocks.push(...rIdResult.blocks);
      footerMeasures.push(...rIdResult.measures);
    }

    // Pass all blocks (main document + headers + footers) to the painter
    painter.setData?.(
      blocks,
      measures,
      headerBlocks.length > 0 ? headerBlocks : undefined,
      headerMeasures.length > 0 ? headerMeasures : undefined,
      footerBlocks.length > 0 ? footerBlocks : undefined,
      footerMeasures.length > 0 ? footerMeasures : undefined,
    );
    painter.paint(layout, this.#painterHost);

    // Reset error state on successful layout
    this.#layoutError = null;
    this.#layoutErrorState = 'healthy';
    this.#dismissErrorBanner();

    const metrics = this.#createLayoutMetrics(perf, startMark, layout, blocks);
    const payload = { layout, blocks, measures, metrics };
    this.emit('layoutUpdated', payload);
    this.emit('paginationUpdate', payload);

    // Emit fresh comment positions after layout completes.
    // This ensures positions are always in sync with the current document and layout.
    const commentPositions = this.#collectCommentPositions();
    const positionKeys = Object.keys(commentPositions);
    if (positionKeys.length > 0) {
      this.emit('commentPositions', { positions: commentPositions });
    }
    if (this.#telemetryEmitter && metrics) {
      this.#telemetryEmitter({ type: 'layout', data: { layout, blocks, measures, metrics } });
    }
    this.#updateSelection();

    // Trigger cursor re-rendering on layout changes without re-normalizing awareness
    // Layout reflow requires repositioning cursors in the DOM, but awareness states haven't changed
    // This optimization avoids expensive Yjs position conversions on every layout update
    if (this.#remoteCursorState.size > 0) {
      this.#scheduleRemoteCursorReRender();
    }
  }

  #ensurePainter(blocks: FlowBlock[], measures: Measure[]) {
    if (!this.#domPainter) {
      this.#domPainter = createDomPainter({
        blocks,
        measures,
        layoutMode: this.#layoutOptions.layoutMode ?? 'vertical',
        virtualization: this.#layoutOptions.virtualization,
        pageStyles: this.#layoutOptions.pageStyles,
        headerProvider: this.#headerDecorationProvider,
        footerProvider: this.#footerDecorationProvider,
        ruler: this.#layoutOptions.ruler,
      });
    }
    return this.#domPainter;
  }

  /**
   * Schedules a cursor/selection update in the next animation frame.
   *
   * Implements guards to prevent race conditions during layout recalculation:
   * - Skips scheduling if already scheduled (prevents duplicate updates)
   * - Skips if layout is being recalculated (#isRerendering || #pendingDocChange)
   *   to avoid rendering cursor before layout is ready
   *
   * The cursor will be updated at the end of #rerender() after layout completes.
   *
   * @returns {void}
   *
   * @remarks
   * Edge cases handled:
   * - Race condition guard: #isRerendering and #pendingDocChange flags prevent
   *   scheduling cursor updates while layout is recalculating, avoiding stale position data.
   * - Deduplication: #selectionUpdateScheduled flag prevents multiple redundant RAF callbacks
   *   from being queued when selection changes rapidly.
   *
   * Side effects:
   * - Sets #selectionUpdateScheduled flag to true
   * - Schedules a requestAnimationFrame callback that calls #updateSelection()
   * - The RAF callback automatically resets #selectionUpdateScheduled to false
   *
   * @private
   */
  #scheduleSelectionUpdate() {
    if (this.#selectionUpdateScheduled) {
      return;
    }
    // If layout is being recalculated, skip scheduling cursor update now.
    // The cursor will be updated at the end of #rerender() after layout completes.
    // This prevents race conditions where cursor rendering happens before layout is ready.
    if (this.#isRerendering || this.#pendingDocChange) {
      return;
    }
    this.#selectionUpdateScheduled = true;
    const win = this.#visibleHost.ownerDocument?.defaultView ?? window;
    win.requestAnimationFrame(() => {
      this.#selectionUpdateScheduled = false;
      this.#updateSelection();
    });
  }

  /**
   * Updates the visual cursor/selection overlay to match the current editor selection.
   *
   * Handles several edge cases:
   * - Defers cursor clearing until new position is successfully computed
   * - Falls back to adjacent positions (from-1, from+1) when exact position lookup fails
   * - Preserves existing cursor visibility when position cannot be computed
   * - Skips rendering in header/footer mode and viewing mode
   *
   * This method is called after layout completes to ensure cursor positioning
   * is based on stable layout data.
   *
   * @returns {void}
   *
   * @remarks
   * Edge cases handled:
   * - Position lookup failure: When #computeCaretLayoutRect(from) returns null (e.g., cursor
   *   on node boundary between paragraph and run), falls back to adjacent positions.
   * - Fallback positions (from-1, from+1): Adjacent positions typically resolve to nearest
   *   text content with valid layout fragments. The fallback logic tries from-1 first
   *   (safer for most text editing), then from+1 if within document bounds.
   * - Bounds validation: Explicitly checks from > 0 before trying from-1, and validates
   *   from+1 <= docSize before trying from+1, preventing invalid position access.
   * - Cursor preservation: If all position lookups fail, keeps existing cursor visible
   *   rather than clearing it, preventing jarring visual disappearance during edge cases.
   * - Invalid document state: If editor state or doc is missing, safely returns early
   *   after clearing cursor (defensive programming for race conditions during init/destroy).
   *
   * Side effects:
   * - Mutates #localSelectionLayer.innerHTML (clears or sets cursor/selection HTML)
   * - Calls #renderCaretOverlay() or #renderSelectionRects() which mutate DOM
   * - DOM manipulation is wrapped in try/catch to prevent errors from breaking editor state
   *
   * Why fallback positions work:
   * ProseMirror positions can land on structural node boundaries (e.g., between <p> and <run>)
   * that don't correspond to renderable layout fragments. Adjacent positions ±1 typically
   * land inside text content with valid layout data. The from-1 fallback is tried first
   * because it's safer for most text editing scenarios (e.g., after backspace at start of line).
   *
   * @private
   */
  #updateSelection() {
    // In header/footer mode, the ProseMirror editor handles its own caret
    if (this.#session.mode !== 'body') {
      return;
    }

    // Only clear local layer, preserve remote cursor layer
    if (!this.#localSelectionLayer) {
      return;
    }

    // In viewing mode, don't render caret or selection highlights
    if (this.#documentMode === 'viewing') {
      try {
        this.#localSelectionLayer.innerHTML = '';
      } catch (error) {
        // DOM manipulation can fail if element is detached or in invalid state
        // Log but don't throw to prevent breaking editor
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PresentationEditor] Failed to clear selection layer in viewing mode:', error);
        }
      }
      return;
    }
    const layout = this.#layoutState.layout;
    const editorState = this.getActiveEditor().state;
    const selection = editorState?.selection;

    if (!selection) {
      try {
        this.#localSelectionLayer.innerHTML = '';
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PresentationEditor] Failed to clear selection layer (no selection):', error);
        }
      }
      return;
    }

    if (!layout) {
      // No layout yet - keep existing cursor visible until layout is ready
      return;
    }

    // Handle CellSelection - render cell backgrounds for selected table cells
    if (selection instanceof CellSelection) {
      try {
        this.#localSelectionLayer.innerHTML = '';
        this.#renderCellSelectionOverlay(selection, layout);
      } catch (error) {
        console.warn('[PresentationEditor] Failed to render cell selection overlay:', error);
      }
      return;
    }

    const { from, to } = selection;
    if (from === to) {
      let caretLayout = this.#computeCaretLayoutRect(from);

      // If exact position fails, try adjacent positions as fallback.
      // This works around edge cases where ProseMirror positions can land on node boundaries
      // (e.g., between paragraph and run nodes) that don't have corresponding layout fragments.
      // Adjacent positions typically resolve to the nearest text content with valid layout data.

      // Validate document state before attempting fallback positions
      const doc = editorState?.doc;
      if (!doc) {
        // Document state is invalid - cannot safely compute positions
        return;
      }

      const docSize = doc.content?.size ?? 0;

      // Explicit bounds checking for fallback positions
      if (!caretLayout && from > 0) {
        caretLayout = this.#computeCaretLayoutRect(from - 1);
      }
      // Only try from + 1 if within document bounds
      if (!caretLayout && from + 1 <= docSize) {
        caretLayout = this.#computeCaretLayoutRect(from + 1);
      }

      if (!caretLayout) {
        // Keep existing cursor visible rather than clearing it
        return;
      }
      // Only clear old cursor after successfully computing new position
      try {
        this.#localSelectionLayer.innerHTML = '';
        this.#renderCaretOverlay(caretLayout);
      } catch (error) {
        // DOM manipulation can fail if element is detached or in invalid state
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PresentationEditor] Failed to render caret overlay:', error);
        }
      }
      return;
    }

    const rects: LayoutRect[] =
      selectionToRects(layout, this.#layoutState.blocks, this.#layoutState.measures, from, to) ?? [];

    // Apply DOM-based position correction to align selection with actual rendered text
    // (same approach used in getRectsForRange for external consumers)
    let domStart: { pageIndex: number; x: number; y: number } | null = null;
    let domEnd: { pageIndex: number; x: number; y: number } | null = null;
    try {
      domStart = this.#computeDomCaretPageLocal(from);
      domEnd = this.#computeDomCaretPageLocal(to);
    } catch (error) {
      // DOM operations can throw exceptions - fall back to uncorrected rects
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PresentationEditor] DOM caret computation failed in #renderLocalSelection:', error);
      }
    }
    const correctedRects = this.#applyDomCorrectionToRects(rects, domStart, domEnd);

    try {
      this.#localSelectionLayer.innerHTML = '';
      this.#renderSelectionRects(correctedRects);
    } catch (error) {
      // DOM manipulation can fail if element is detached or in invalid state
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PresentationEditor] Failed to render selection rects:', error);
      }
    }
  }

  #resolveLayoutOptions(blocks: FlowBlock[] | undefined, sectionMetadata: SectionMetadata[]) {
    const defaults = this.#computeDefaultLayoutDefaults();
    const firstSection = blocks?.find(
      (block) =>
        block.kind === 'sectionBreak' &&
        (block as FlowBlock & { attrs?: { isFirstSection?: boolean } })?.attrs?.isFirstSection,
    ) as
      | (FlowBlock & {
          kind: 'sectionBreak';
          pageSize?: PageSize;
          columns?: ColumnLayout;
          margins?: { header?: number; footer?: number };
        })
      | undefined;

    const pageSize = firstSection?.pageSize ?? defaults.pageSize;
    const margins: PageMargins = {
      ...defaults.margins,
      ...(firstSection?.margins?.header != null ? { header: firstSection.margins.header } : {}),
      ...(firstSection?.margins?.footer != null ? { footer: firstSection.margins.footer } : {}),
    };
    const columns = firstSection?.columns ?? defaults.columns;

    this.#layoutOptions.pageSize = pageSize;
    this.#layoutOptions.margins = margins;

    this.#hiddenHost.style.width = `${pageSize.w}px`;

    return {
      pageSize,
      margins: margins as Required<Pick<PageMargins, 'top' | 'right' | 'bottom' | 'left'>> &
        Partial<Pick<PageMargins, 'header' | 'footer'>>,
      ...(columns ? { columns } : {}),
      sectionMetadata,
    };
  }

  #buildHeaderFooterInput() {
    if (!this.#headerFooterAdapter) {
      return null;
    }
    const headerBlocks = this.#headerFooterAdapter.getBatch('header');
    const footerBlocks = this.#headerFooterAdapter.getBatch('footer');
    // Also get all blocks by rId for multi-section support
    const headerBlocksByRId = this.#headerFooterAdapter.getBlocksByRId('header');
    const footerBlocksByRId = this.#headerFooterAdapter.getBlocksByRId('footer');
    if (!headerBlocks && !footerBlocks && !headerBlocksByRId && !footerBlocksByRId) {
      return null;
    }
    const constraints = this.#computeHeaderFooterConstraints();
    if (!constraints) {
      return null;
    }
    return {
      headerBlocks,
      footerBlocks,
      headerBlocksByRId,
      footerBlocksByRId,
      constraints,
    };
  }

  #computeHeaderFooterConstraints() {
    const pageSize = this.#layoutOptions.pageSize ?? DEFAULT_PAGE_SIZE;
    const margins = this.#layoutOptions.margins ?? DEFAULT_MARGINS;
    const marginLeft = margins.left ?? DEFAULT_MARGINS.left!;
    const marginRight = margins.right ?? DEFAULT_MARGINS.right!;
    const bodyContentWidth = pageSize.w - (marginLeft + marginRight);
    if (!Number.isFinite(bodyContentWidth) || bodyContentWidth <= 0) {
      return null;
    }

    // Use body content width for header/footer measurement.
    // Headers/footers should respect the same left/right margins as the body.
    // Note: Tables that need to span beyond margins should use negative indents
    // or be handled via table-specific overflow logic, not by expanding the
    // measurement width for all content.
    const measurementWidth = bodyContentWidth;

    // Compute available space for header/footer content.
    // In OOXML, margins.header is the distance from page top to header top,
    // and margins.top is the distance from page top to body content.
    // The actual header content space is: top margin - header margin.
    // Similarly for footer: bottom margin - footer margin.
    const marginTop = margins.top ?? DEFAULT_MARGINS.top!;
    const marginBottom = margins.bottom ?? DEFAULT_MARGINS.bottom!;
    const headerMargin = margins.header ?? 0;
    const footerMargin = margins.footer ?? 0;

    // Available header space is from headerMargin to topMargin
    const headerContentSpace = Math.max(marginTop - headerMargin, 0);
    // Available footer space is from footerMargin to bottomMargin
    const footerContentSpace = Math.max(marginBottom - footerMargin, 0);

    // Use the larger of the two as the constraint height, with a minimum of 1
    const height = Math.max(headerContentSpace, footerContentSpace, 1);
    return {
      width: measurementWidth,
      height,
      // Pass actual page dimensions for page-relative anchor positioning in headers/footers
      pageWidth: pageSize.w,
      margins: { left: marginLeft, right: marginRight },
    };
  }

  /**
   * Lays out per-rId header/footer content for multi-section documents.
   *
   * This method processes header/footer content for each unique rId, enabling
   * different sections to have different header/footer content. The layouts
   * are stored in #headerLayoutsByRId and #footerLayoutsByRId for use by
   * the decoration provider.
   */
  async #layoutPerRIdHeaderFooters(
    headerFooterInput: {
      headerBlocks?: unknown;
      footerBlocks?: unknown;
      headerBlocksByRId: Map<string, FlowBlock[]> | undefined;
      footerBlocksByRId: Map<string, FlowBlock[]> | undefined;
      constraints: { width: number; height: number; pageWidth: number; margins: { left: number; right: number } };
    } | null,
    layout: Layout,
    sectionMetadata: SectionMetadata[],
  ): Promise<void> {
    this.#headerLayoutsByRId.clear();
    this.#footerLayoutsByRId.clear();

    if (!headerFooterInput) return;

    const { headerBlocksByRId, footerBlocksByRId, constraints } = headerFooterInput;

    // Build section-aware display page numbers using computeDisplayPageNumber
    // This handles format (roman, decimal, letter) and restart numbering per section
    const displayPages = computeDisplayPageNumber(layout.pages, sectionMetadata);
    const totalPages = layout.pages.length;

    // Build page resolver that uses section-aware display text
    const pageResolver = (pageNumber: number): { displayText: string; totalPages: number } => {
      const pageIndex = pageNumber - 1;
      const displayInfo = displayPages[pageIndex];
      return {
        displayText: displayInfo?.displayText ?? String(pageNumber),
        totalPages,
      };
    };

    // Process header blocks by rId
    if (headerBlocksByRId) {
      for (const [rId, blocks] of headerBlocksByRId) {
        if (!blocks || blocks.length === 0) continue;

        try {
          const batchResult = await layoutHeaderFooterWithCache(
            { default: blocks }, // Treat each rId as a 'default' variant
            constraints,
            (block: FlowBlock, c: { maxWidth: number; maxHeight: number }) => measureBlock(block, c),
            undefined, // Use shared cache
            undefined, // No legacy totalPages
            pageResolver,
          );

          if (batchResult.default) {
            this.#headerLayoutsByRId.set(rId, {
              kind: 'header',
              type: 'default',
              layout: batchResult.default.layout,
              blocks: batchResult.default.blocks,
              measures: batchResult.default.measures,
            });
          }
        } catch (error) {
          console.warn(`[PresentationEditor] Failed to layout header rId=${rId}:`, error);
        }
      }
    }

    // Process footer blocks by rId
    if (footerBlocksByRId) {
      for (const [rId, blocks] of footerBlocksByRId) {
        if (!blocks || blocks.length === 0) continue;

        try {
          const batchResult = await layoutHeaderFooterWithCache(
            { default: blocks }, // Treat each rId as a 'default' variant
            constraints,
            (block: FlowBlock, c: { maxWidth: number; maxHeight: number }) => measureBlock(block, c),
            undefined, // Use shared cache
            undefined, // No legacy totalPages
            pageResolver,
          );

          if (batchResult.default) {
            this.#footerLayoutsByRId.set(rId, {
              kind: 'footer',
              type: 'default',
              layout: batchResult.default.layout,
              blocks: batchResult.default.blocks,
              measures: batchResult.default.measures,
            });
          }
        } catch (error) {
          console.warn(`[PresentationEditor] Failed to layout footer rId=${rId}:`, error);
        }
      }
    }
  }

  #updateDecorationProviders(layout: Layout) {
    this.#headerDecorationProvider = this.#createDecorationProvider('header', layout);
    this.#footerDecorationProvider = this.#createDecorationProvider('footer', layout);
    this.#rebuildHeaderFooterRegions(layout);
  }

  #createDecorationProvider(kind: 'header' | 'footer', layout: Layout): PageDecorationProvider | undefined {
    const results = kind === 'header' ? this.#headerLayoutResults : this.#footerLayoutResults;
    const layoutsByRId = kind === 'header' ? this.#headerLayoutsByRId : this.#footerLayoutsByRId;

    if ((!results || results.length === 0) && layoutsByRId.size === 0) {
      return undefined;
    }

    const multiSectionId = this.#multiSectionIdentifier;
    const legacyIdentifier =
      this.#headerFooterIdentifier ??
      extractIdentifierFromConverter((this.#editor as Editor & { converter?: unknown }).converter);

    const sectionFirstPageNumbers = new Map<number, number>();
    for (const p of layout.pages) {
      const idx = p.sectionIndex ?? 0;
      if (!sectionFirstPageNumbers.has(idx)) {
        sectionFirstPageNumbers.set(idx, p.number);
      }
    }

    return (pageNumber, pageMargins, page) => {
      const sectionIndex = page?.sectionIndex ?? 0;
      const firstPageInSection = sectionFirstPageNumbers.get(sectionIndex);
      const sectionPageNumber =
        typeof firstPageInSection === 'number' ? pageNumber - firstPageInSection + 1 : pageNumber;
      const headerFooterType = multiSectionId
        ? getHeaderFooterTypeForSection(pageNumber, sectionIndex, multiSectionId, { kind, sectionPageNumber })
        : getHeaderFooterType(pageNumber, legacyIdentifier, { kind });

      const sectionRId =
        page?.sectionRefs && kind === 'header'
          ? (page.sectionRefs.headerRefs?.[headerFooterType as keyof typeof page.sectionRefs.headerRefs] ?? undefined)
          : page?.sectionRefs && kind === 'footer'
            ? (page.sectionRefs.footerRefs?.[headerFooterType as keyof typeof page.sectionRefs.footerRefs] ?? undefined)
            : undefined;

      if (!headerFooterType) {
        return null;
      }

      // PRIORITY 1: Try per-rId layout if we have a section-specific rId
      if (sectionRId && layoutsByRId.has(sectionRId)) {
        const rIdLayout = layoutsByRId.get(sectionRId)!;
        const slotPage = this.#findHeaderFooterPageForPageNumber(rIdLayout.layout.pages, pageNumber);
        if (slotPage) {
          const fragments = slotPage.fragments ?? [];
          const pageHeight =
            page?.size?.h ?? layout.pageSize?.h ?? this.#layoutOptions.pageSize?.h ?? DEFAULT_PAGE_SIZE.h;
          const margins = pageMargins ?? layout.pages[0]?.margins ?? this.#layoutOptions.margins ?? DEFAULT_MARGINS;
          const box = this.#computeDecorationBox(kind, margins, pageHeight);
          return {
            fragments,
            height: box.height,
            contentHeight: rIdLayout.layout.height ?? box.height,
            offset: box.offset,
            marginLeft: box.x,
            contentWidth: box.width,
            headerId: sectionRId,
            sectionType: headerFooterType,
            box: {
              x: box.x,
              y: box.offset,
              width: box.width,
              height: box.height,
            },
            hitRegion: {
              x: box.x,
              y: box.offset,
              width: box.width,
              height: box.height,
            },
          };
        }
      }

      // PRIORITY 2: Fall back to variant-based layout (legacy behavior)
      if (!results || results.length === 0) {
        return null;
      }

      const variant = results.find((entry) => entry.type === headerFooterType);
      if (!variant || !variant.layout?.pages?.length) {
        return null;
      }

      const slotPage = this.#findHeaderFooterPageForPageNumber(variant.layout.pages, pageNumber);
      if (!slotPage) {
        return null;
      }
      const fragments = slotPage.fragments ?? [];
      const pageHeight = page?.size?.h ?? layout.pageSize?.h ?? this.#layoutOptions.pageSize?.h ?? DEFAULT_PAGE_SIZE.h;
      const margins = pageMargins ?? layout.pages[0]?.margins ?? this.#layoutOptions.margins ?? DEFAULT_MARGINS;
      const box = this.#computeDecorationBox(kind, margins, pageHeight);
      const fallbackId = this.#headerFooterManager?.getVariantId(kind, headerFooterType);
      const finalHeaderId = sectionRId ?? fallbackId ?? undefined;
      return {
        fragments,
        height: box.height,
        contentHeight: variant.layout.height ?? box.height,
        offset: box.offset,
        marginLeft: box.x,
        contentWidth: box.width,
        headerId: finalHeaderId,
        sectionType: headerFooterType,
        box: {
          x: box.x,
          y: box.offset,
          width: box.width,
          height: box.height,
        },
        hitRegion: {
          x: box.x,
          y: box.offset,
          width: box.width,
          height: box.height,
        },
      };
    };
  }

  /**
   * Finds the header/footer page layout for a given page number with bucket fallback.
   *
   * Lookup strategy:
   * 1. Try exact match first (find page with matching number)
   * 2. If bucketing is used, fall back to the bucket's representative page
   * 3. Finally, fall back to the first available page
   *
   * Digit buckets (for large documents):
   * - d1: pages 1-9 → representative page 5
   * - d2: pages 10-99 → representative page 50
   * - d3: pages 100-999 → representative page 500
   * - d4: pages 1000+ → representative page 5000
   *
   * @param pages - Array of header/footer layout pages from the variant
   * @param pageNumber - Physical page number to find layout for (1-indexed)
   * @returns Header/footer page layout, or undefined if no suitable page found
   */
  #findHeaderFooterPageForPageNumber(
    pages: Array<{ number: number; fragments: Fragment[] }>,
    pageNumber: number,
  ): { number: number; fragments: Fragment[] } | undefined {
    if (!pages || pages.length === 0) {
      return undefined;
    }

    // 1. Try exact match first
    const exactMatch = pages.find((p) => p.number === pageNumber);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. If bucketing is used, find the representative for this page's bucket
    const bucket = getBucketForPageNumber(pageNumber);
    const representative = getBucketRepresentative(bucket);
    const bucketMatch = pages.find((p) => p.number === representative);
    if (bucketMatch) {
      return bucketMatch;
    }

    // 3. Final fallback: return the first available page
    return pages[0];
  }

  #computeDecorationBox(kind: 'header' | 'footer', pageMargins?: PageMargins, pageHeight?: number) {
    const margins = pageMargins ?? this.#layoutOptions.margins ?? DEFAULT_MARGINS;
    const pageSize = this.#layoutOptions.pageSize ?? DEFAULT_PAGE_SIZE;
    const left = margins.left ?? DEFAULT_MARGINS.left!;
    const right = margins.right ?? DEFAULT_MARGINS.right!;
    const width = Math.max(pageSize.w - (left + right), 1);
    const totalHeight = pageHeight ?? pageSize.h;

    // MS Word positioning:
    // - Header: starts at headerMargin from page top, can extend down to topMargin
    // - Footer: ends at footerMargin from page bottom, can extend up to bottomMargin
    if (kind === 'header') {
      const headerMargin = margins.header ?? 0;
      const topMargin = margins.top ?? DEFAULT_MARGINS.top ?? 0;
      // Height is the space available for header (between headerMargin and topMargin)
      const height = Math.max(topMargin - headerMargin, 1);
      return { x: left, width, height, offset: headerMargin };
    } else {
      const footerMargin = margins.footer ?? 0;
      const bottomMargin = margins.bottom ?? DEFAULT_MARGINS.bottom ?? 0;
      // Height is the space available for footer (between bottomMargin and footerMargin)
      const height = Math.max(bottomMargin - footerMargin, 1);
      // Position so container bottom is at footerMargin from page bottom
      const offset = Math.max(0, totalHeight - footerMargin - height);
      return { x: left, width, height, offset };
    }
  }

  /**
   * Computes the expected header/footer section type for a page based on document configuration.
   *
   * Unlike getHeaderFooterType/getHeaderFooterTypeForSection, this returns the appropriate
   * variant even when no header/footer IDs are configured. This is needed to determine
   * what variant to create when the user double-clicks an empty header/footer region.
   *
   * @param kind - Whether this is for a header or footer
   * @param page - The page to compute the section type for
   * @param sectionFirstPageNumbers - Map of section index to first page number in that section
   * @returns The expected section type ('default', 'first', 'even', or 'odd')
   */
  #computeExpectedSectionType(
    kind: 'header' | 'footer',
    page: Page,
    sectionFirstPageNumbers: Map<number, number>,
  ): HeaderFooterType {
    const sectionIndex = page.sectionIndex ?? 0;
    const firstPageInSection = sectionFirstPageNumbers.get(sectionIndex);
    const sectionPageNumber =
      typeof firstPageInSection === 'number' ? page.number - firstPageInSection + 1 : page.number;

    // Get titlePg and alternateHeaders settings from identifiers
    const multiSectionId = this.#multiSectionIdentifier;
    const legacyIdentifier = this.#headerFooterIdentifier;

    let titlePgEnabled = false;
    let alternateHeaders = false;

    if (multiSectionId) {
      titlePgEnabled = multiSectionId.sectionTitlePg?.get(sectionIndex) ?? multiSectionId.titlePg;
      alternateHeaders = multiSectionId.alternateHeaders;
    } else if (legacyIdentifier) {
      titlePgEnabled = legacyIdentifier.titlePg;
      alternateHeaders = legacyIdentifier.alternateHeaders;
    }

    // First page of section with titlePg enabled
    if (sectionPageNumber === 1 && titlePgEnabled) {
      return 'first';
    }

    // Alternate headers (even/odd)
    if (alternateHeaders) {
      return page.number % 2 === 0 ? 'even' : 'odd';
    }

    return 'default';
  }

  #rebuildHeaderFooterRegions(layout: Layout) {
    this.#headerRegions.clear();
    this.#footerRegions.clear();
    const pageHeight = layout.pageSize?.h ?? this.#layoutOptions.pageSize?.h ?? DEFAULT_PAGE_SIZE.h;
    if (pageHeight <= 0) return;

    // Build section first page numbers map (same logic as in #createDecorationProvider)
    const sectionFirstPageNumbers = new Map<number, number>();
    for (const p of layout.pages) {
      const idx = p.sectionIndex ?? 0;
      if (!sectionFirstPageNumbers.has(idx)) {
        sectionFirstPageNumbers.set(idx, p.number);
      }
    }

    layout.pages.forEach((page, pageIndex) => {
      const margins = page.margins ?? this.#layoutOptions.margins ?? DEFAULT_MARGINS;
      const actualPageHeight = page.size?.h ?? pageHeight;

      // Try to get payload from decoration provider (may be null if no content exists)
      const headerPayload = this.#headerDecorationProvider?.(page.number, margins, page);

      // Always create a hit region for headers - use payload's hitRegion or compute fallback
      const headerBox = this.#computeDecorationBox('header', margins, actualPageHeight);
      this.#headerRegions.set(pageIndex, {
        kind: 'header',
        headerId: headerPayload?.headerId,
        sectionType:
          headerPayload?.sectionType ?? this.#computeExpectedSectionType('header', page, sectionFirstPageNumbers),
        pageIndex,
        pageNumber: page.number,
        localX: headerPayload?.hitRegion?.x ?? headerBox.x,
        localY: headerPayload?.hitRegion?.y ?? headerBox.offset,
        width: headerPayload?.hitRegion?.width ?? headerBox.width,
        height: headerPayload?.hitRegion?.height ?? headerBox.height,
      });

      // Same for footer - always create a hit region
      const footerPayload = this.#footerDecorationProvider?.(page.number, margins, page);
      const footerBox = this.#computeDecorationBox('footer', margins, actualPageHeight);
      this.#footerRegions.set(pageIndex, {
        kind: 'footer',
        headerId: footerPayload?.headerId,
        sectionType:
          footerPayload?.sectionType ?? this.#computeExpectedSectionType('footer', page, sectionFirstPageNumbers),
        pageIndex,
        pageNumber: page.number,
        localX: footerPayload?.hitRegion?.x ?? footerBox.x,
        localY: footerPayload?.hitRegion?.y ?? footerBox.offset,
        width: footerPayload?.hitRegion?.width ?? footerBox.width,
        height: footerPayload?.hitRegion?.height ?? footerBox.height,
      });
    });
  }

  #hitTestHeaderFooterRegion(x: number, y: number): HeaderFooterRegion | null {
    const layout = this.#layoutState.layout;
    if (!layout) return null;
    const pageHeight = layout.pageSize?.h ?? this.#layoutOptions.pageSize?.h ?? DEFAULT_PAGE_SIZE.h;
    const pageGap = layout.pageGap ?? 0;
    if (pageHeight <= 0) return null;
    const pageIndex = Math.max(0, Math.floor(y / (pageHeight + pageGap)));
    const pageLocalY = y - pageIndex * (pageHeight + pageGap);

    const headerRegion = this.#headerRegions.get(pageIndex);
    if (headerRegion && this.#pointInRegion(headerRegion, x, pageLocalY)) {
      return headerRegion;
    }
    const footerRegion = this.#footerRegions.get(pageIndex);
    if (footerRegion && this.#pointInRegion(footerRegion, x, pageLocalY)) {
      return footerRegion;
    }
    return null;
  }

  #pointInRegion(region: HeaderFooterRegion, x: number, localY: number) {
    const withinX = x >= region.localX && x <= region.localX + region.width;
    const withinY = localY >= region.localY && localY <= region.localY + region.height;
    return withinX && withinY;
  }

  #activateHeaderFooterRegion(region: HeaderFooterRegion) {
    const permission = this.#validateHeaderFooterEditPermission();
    if (!permission.allowed) {
      this.#emitHeaderFooterEditBlocked(permission.reason ?? 'restricted');
      return;
    }
    void this.#enterHeaderFooterMode(region);
  }

  async #enterHeaderFooterMode(region: HeaderFooterRegion) {
    try {
      if (!this.#headerFooterManager || !this.#overlayManager) {
        // Clear hover on early exit to prevent stale hover state
        this.#clearHoverRegion();
        return;
      }

      const descriptor = this.#resolveDescriptorForRegion(region);
      if (!descriptor) {
        console.warn('[PresentationEditor] No descriptor found for region:', region);
        // Clear hover on validation failure to prevent stale hover state
        this.#clearHoverRegion();
        return;
      }
      if (!descriptor.id) {
        console.warn('[PresentationEditor] Descriptor missing id:', descriptor);
        // Clear hover on validation failure to prevent stale hover state
        this.#clearHoverRegion();
        return;
      }

      // Virtualized pages may not be mounted - scroll into view if needed
      let pageElement = this.#getPageElement(region.pageIndex);
      if (!pageElement) {
        try {
          this.#scrollPageIntoView(region.pageIndex);
          const mounted = await this.#waitForPageMount(region.pageIndex, { timeout: 2000 });
          if (!mounted) {
            console.error('[PresentationEditor] Failed to mount page for header/footer editing');
            this.#clearHoverRegion();
            this.emit('error', {
              error: new Error('Failed to mount page for editing'),
              context: 'enterHeaderFooterMode',
            });
            return;
          }
          pageElement = this.#getPageElement(region.pageIndex);
        } catch (scrollError) {
          console.error('[PresentationEditor] Error mounting page:', scrollError);
          this.#clearHoverRegion();
          this.emit('error', {
            error: scrollError,
            context: 'enterHeaderFooterMode.pageMount',
          });
          return;
        }
      }

      if (!pageElement) {
        console.error('[PresentationEditor] Page element not found after mount attempt');
        this.#clearHoverRegion();
        this.emit('error', {
          error: new Error('Page element not found after mount'),
          context: 'enterHeaderFooterMode',
        });
        return;
      }

      const { success, editorHost, reason } = this.#overlayManager.showEditingOverlay(
        pageElement,
        region,
        this.#layoutOptions.zoom ?? 1,
      );
      if (!success || !editorHost) {
        console.error('[PresentationEditor] Failed to create editor host:', reason);
        this.#clearHoverRegion();
        this.emit('error', {
          error: new Error(`Failed to create editor host: ${reason}`),
          context: 'enterHeaderFooterMode.showOverlay',
        });
        return;
      }

      const layout = this.#layoutState.layout;
      let editor;
      try {
        editor = await this.#headerFooterManager.ensureEditor(descriptor, {
          editorHost,
          availableWidth: region.width,
          availableHeight: region.height,
          currentPageNumber: region.pageNumber,
          totalPageCount: layout?.pages?.length ?? 1,
        });
      } catch (editorError) {
        console.error('[PresentationEditor] Error creating editor:', editorError);
        // Clean up overlay on error
        this.#overlayManager.hideEditingOverlay();
        this.#clearHoverRegion();
        this.emit('error', {
          error: editorError,
          context: 'enterHeaderFooterMode.ensureEditor',
        });
        return;
      }

      if (!editor) {
        console.warn('[PresentationEditor] Failed to ensure editor for descriptor:', descriptor);
        // Clean up overlay if editor creation failed
        this.#overlayManager.hideEditingOverlay();
        this.#clearHoverRegion();
        this.emit('error', {
          error: new Error('Failed to create editor instance'),
          context: 'enterHeaderFooterMode.ensureEditor',
        });
        return;
      }

      try {
        editor.setEditable(true);
        editor.setOptions({ documentMode: 'editing' });

        // Move caret to end of content (better UX than starting at position 0)
        try {
          const doc = editor.state?.doc;
          if (doc) {
            const endPos = doc.content.size - 1; // Position at end of content
            const pos = Math.max(1, endPos);
            editor.commands?.setTextSelection?.({ from: pos, to: pos });
          }
        } catch (cursorError) {
          // Non-critical error, log but continue
          console.warn('[PresentationEditor] Could not set cursor to end:', cursorError);
        }
      } catch (editableError) {
        console.error('[PresentationEditor] Error setting editor editable:', editableError);
        // Clean up on error
        this.#overlayManager.hideEditingOverlay();
        this.#clearHoverRegion();
        this.emit('error', {
          error: editableError,
          context: 'enterHeaderFooterMode.setEditable',
        });
        return;
      }

      // Hide layout selection overlay so only the ProseMirror caret is visible
      this.#overlayManager.hideSelectionOverlay();

      this.#activeHeaderFooterEditor = editor;

      this.#session = {
        mode: region.kind,
        kind: region.kind,
        headerId: descriptor.id,
        sectionType: descriptor.variant ?? region.sectionType ?? null,
        pageIndex: region.pageIndex,
        pageNumber: region.pageNumber,
      };

      this.#clearHoverRegion();

      try {
        editor.view?.focus();
      } catch (focusError) {
        // Non-critical error, log but continue
        console.warn('[PresentationEditor] Could not focus editor:', focusError);
      }

      this.#emitHeaderFooterModeChanged();
      this.#emitHeaderFooterEditingContext(editor);
      this.#inputBridge?.notifyTargetChanged();
    } catch (error) {
      // Catch any unexpected errors and clean up
      console.error('[PresentationEditor] Unexpected error in enterHeaderFooterMode:', error);

      // Attempt cleanup
      try {
        this.#overlayManager?.hideEditingOverlay();
        this.#overlayManager?.showSelectionOverlay();
        this.#clearHoverRegion();
        this.#activeHeaderFooterEditor = null;
        this.#session = { mode: 'body' };
      } catch (cleanupError) {
        console.error('[PresentationEditor] Error during cleanup:', cleanupError);
      }

      // Emit error event
      this.emit('error', {
        error,
        context: 'enterHeaderFooterMode',
      });
    }
  }

  #exitHeaderFooterMode() {
    if (this.#session.mode === 'body') return;

    // Capture headerId before clearing session - needed for cache invalidation
    const editedHeaderId = this.#session.headerId;

    if (this.#activeHeaderFooterEditor) {
      this.#activeHeaderFooterEditor.setEditable(false);
      this.#activeHeaderFooterEditor.setOptions({ documentMode: 'viewing' });
    }

    this.#overlayManager?.hideEditingOverlay();
    this.#overlayManager?.showSelectionOverlay();

    this.#activeHeaderFooterEditor = null;
    this.#session = { mode: 'body' };

    this.#emitHeaderFooterModeChanged();
    this.#emitHeaderFooterEditingContext(this.#editor);
    this.#inputBridge?.notifyTargetChanged();

    // Invalidate layout cache and trigger re-render to show updated header/footer content
    if (editedHeaderId) {
      this.#headerFooterAdapter?.invalidate(editedHeaderId);
    }
    this.#headerFooterManager?.refresh();
    this.#pendingDocChange = true;
    this.#scheduleRerender();

    this.#editor.view?.focus();
  }

  #getActiveDomTarget(): HTMLElement | null {
    if (this.#session.mode !== 'body') {
      return this.#activeHeaderFooterEditor?.view?.dom ?? this.#editor.view?.dom ?? null;
    }
    return this.#editor.view?.dom ?? null;
  }

  #emitHeaderFooterModeChanged() {
    this.emit('headerFooterModeChanged', {
      mode: this.#session.mode,
      kind: this.#session.kind,
      headerId: this.#session.headerId,
      sectionType: this.#session.sectionType,
      pageIndex: this.#session.pageIndex,
      pageNumber: this.#session.pageNumber,
    });
    this.#updateAwarenessSession();
    this.#updateModeBanner();
  }

  #emitHeaderFooterEditingContext(editor: Editor) {
    this.emit('headerFooterEditingContext', {
      kind: this.#session.mode,
      editor,
      headerId: this.#session.headerId,
      sectionType: this.#session.sectionType,
    });
    this.#announce(
      this.#session.mode === 'body'
        ? 'Exited header/footer edit mode.'
        : `Editing ${this.#session.kind === 'header' ? 'Header' : 'Footer'} (${this.#session.sectionType ?? 'default'})`,
    );
  }

  #updateAwarenessSession() {
    const provider = this.#options.collaborationProvider;
    const awareness = provider?.awareness;

    // Runtime validation: ensure setLocalStateField method exists
    if (!awareness || typeof awareness.setLocalStateField !== 'function') {
      return;
    }

    if (this.#session.mode === 'body') {
      awareness.setLocalStateField('layoutSession', null);
      return;
    }
    awareness.setLocalStateField('layoutSession', {
      kind: this.#session.kind,
      headerId: this.#session.headerId ?? null,
      pageNumber: this.#session.pageNumber ?? null,
    });
  }

  #updateModeBanner() {
    if (!this.#modeBanner) return;
    if (this.#session.mode === 'body') {
      this.#modeBanner.style.display = 'none';
      this.#modeBanner.textContent = '';
      return;
    }
    const title = this.#session.kind === 'header' ? 'Header' : 'Footer';
    const variant = this.#session.sectionType ?? 'default';
    const page = this.#session.pageNumber != null ? `Page ${this.#session.pageNumber}` : '';
    this.#modeBanner.textContent = `Editing ${title} (${variant}) ${page} – Press Esc to return`;
    this.#modeBanner.style.display = 'block';
  }

  #announce(message: string) {
    if (!this.#ariaLiveRegion) return;
    this.#ariaLiveRegion.textContent = message;
  }

  #validateHeaderFooterEditPermission(): { allowed: boolean; reason?: string } {
    if (this.#documentMode === 'viewing') {
      return { allowed: false, reason: 'documentMode' };
    }
    if (!this.#editor.isEditable) {
      return { allowed: false, reason: 'readOnly' };
    }
    return { allowed: true };
  }

  #emitHeaderFooterEditBlocked(reason: string) {
    this.emit('headerFooterEditBlocked', { reason });
  }

  #resolveDescriptorForRegion(region: HeaderFooterRegion): HeaderFooterDescriptor | null {
    if (!this.#headerFooterManager) return null;
    if (region.headerId) {
      const descriptor = this.#headerFooterManager.getDescriptorById(region.headerId);
      if (descriptor) return descriptor;
    }
    if (region.sectionType) {
      const descriptors = this.#headerFooterManager.getDescriptors(region.kind);
      const match = descriptors.find((entry) => entry.variant === region.sectionType);
      if (match) return match;
    }
    const descriptors = this.#headerFooterManager.getDescriptors(region.kind);
    if (!descriptors.length) {
      console.warn('[PresentationEditor] No descriptor found for region:', region);
      return null;
    }
    return descriptors[0];
  }

  /**
   * Creates a default header or footer when none exists.
   *
   * This method is called when a user double-clicks a header/footer region
   * but no content exists yet. It uses the converter API to create an empty
   * header/footer document.
   *
   * @param region - The header/footer region containing kind ('header' | 'footer')
   *   and sectionType ('default' | 'first' | 'even' | 'odd') information
   *
   * Side effects:
   * - Calls converter.createDefaultHeader() or converter.createDefaultFooter() to
   *   create a new header/footer document in the underlying document model
   * - Updates this.#headerFooterIdentifier with the new header/footer IDs from
   *   the converter after creation
   *
   * Behavior when converter is unavailable:
   * - Returns early without creating any header/footer if converter is not attached
   * - Returns early if the appropriate create method is not available on the converter
   */
  #createDefaultHeaderFooter(region: HeaderFooterRegion): void {
    const converter = (this.#editor as EditorWithConverter).converter;

    if (!converter) {
      return;
    }

    const variant = region.sectionType ?? 'default';

    if (region.kind === 'header' && typeof converter.createDefaultHeader === 'function') {
      converter.createDefaultHeader(variant);
    } else if (region.kind === 'footer' && typeof converter.createDefaultFooter === 'function') {
      converter.createDefaultFooter(variant);
    }

    // Update legacy identifier for getHeaderFooterType() fallback path
    this.#headerFooterIdentifier = extractIdentifierFromConverter(converter);
  }

  /**
   * Gets the DOM element for a specific page index.
   *
   * @param pageIndex - Zero-based page index
   * @returns The page element or null if not mounted
   */
  #getPageElement(pageIndex: number): HTMLElement | null {
    if (!this.#painterHost) return null;
    // Page elements have data-page-index attribute
    const pageElements = this.#painterHost.querySelectorAll('[data-page-index]');
    for (let i = 0; i < pageElements.length; i++) {
      const el = pageElements[i] as HTMLElement;
      const dataPageIndex = el.getAttribute('data-page-index');
      if (dataPageIndex && parseInt(dataPageIndex, 10) === pageIndex) {
        return el;
      }
    }
    return null;
  }

  /**
   * Scrolls a page into view, triggering virtualization to mount it if needed.
   *
   * @param pageIndex - Zero-based page index to scroll to
   */
  #scrollPageIntoView(pageIndex: number): void {
    const layout = this.#layoutState.layout;
    if (!layout) return;

    const pageHeight = layout.pageSize?.h ?? DEFAULT_PAGE_SIZE.h;
    const virtualGap = this.#layoutOptions.virtualization?.gap ?? 0;

    // Calculate approximate y position for the page
    const yPosition = pageIndex * (pageHeight + virtualGap);

    // Scroll viewport to the calculated position
    if (this.#visibleHost) {
      this.#visibleHost.scrollTop = yPosition;
    }
  }

  /**
   * Build an anchor map (bookmark name -> page index) using fragment PM ranges.
   * Mirrors layout-engine's buildAnchorMap to avoid an extra dependency here.
   */
  #computeAnchorMap(bookmarks: Map<string, number>, layout: Layout): Map<string, number> {
    const anchorMap = new Map<string, number>();

    // Precompute block PM ranges for fallbacks
    const blockPmRanges = new Map<
      string,
      { pmStart: number | null; pmEnd: number | null; hasFragmentPositions: boolean }
    >();

    const computeBlockRange = (blockId: string): { pmStart: number | null; pmEnd: number | null } => {
      if (blockPmRanges.has(blockId)) {
        const cached = blockPmRanges.get(blockId)!;
        return { pmStart: cached.pmStart, pmEnd: cached.pmEnd };
      }
      const block = this.#layoutState.blocks.find((b) => b.id === blockId);
      if (!block || block.kind !== 'paragraph') {
        blockPmRanges.set(blockId, { pmStart: null, pmEnd: null, hasFragmentPositions: false });
        return { pmStart: null, pmEnd: null };
      }
      let pmStart: number | null = null;
      let pmEnd: number | null = null;
      for (const run of block.runs) {
        if (run.pmStart != null) {
          pmStart = pmStart == null ? run.pmStart : Math.min(pmStart, run.pmStart);
        }
        if (run.pmEnd != null) {
          pmEnd = pmEnd == null ? run.pmEnd : Math.max(pmEnd, run.pmEnd);
        }
      }
      blockPmRanges.set(blockId, { pmStart, pmEnd, hasFragmentPositions: false });
      return { pmStart, pmEnd };
    };

    bookmarks.forEach((pmPosition, bookmarkName) => {
      for (const page of layout.pages) {
        for (const fragment of page.fragments) {
          if (fragment.kind !== 'para') continue;
          let fragStart = fragment.pmStart;
          let fragEnd = fragment.pmEnd;
          if (fragStart == null || fragEnd == null) {
            const range = computeBlockRange(fragment.blockId);
            if (range.pmStart != null && range.pmEnd != null) {
              fragStart = range.pmStart;
              fragEnd = range.pmEnd;
            }
          } else {
            // Remember that this block had fragment positions
            const cached = blockPmRanges.get(fragment.blockId);
            blockPmRanges.set(fragment.blockId, {
              pmStart: cached?.pmStart ?? fragStart,
              pmEnd: cached?.pmEnd ?? fragEnd,
              hasFragmentPositions: true,
            });
          }
          if (fragStart == null || fragEnd == null) continue;
          if (pmPosition >= fragStart && pmPosition < fragEnd) {
            anchorMap.set(bookmarkName, page.number);
            return;
          }
        }
      }
    });

    return anchorMap;
  }

  /**
   * Timeout duration for anchor navigation when waiting for page mount (in milliseconds).
   * This allows sufficient time for virtualized pages to render before giving up.
   */
  private static readonly ANCHOR_NAV_TIMEOUT_MS = 2000;

  /**
   * Navigate to a bookmark/anchor in the current document (e.g., TOC links).
   *
   * This method performs asynchronous navigation to support virtualized page rendering:
   * 1. Normalizes the anchor by removing leading '#' if present
   * 2. Looks up the bookmark in the document's bookmark registry
   * 3. Determines which page contains the target position
   * 4. Scrolls the page into view (may be virtualized)
   * 5. Waits up to 2000ms for the page to mount in the DOM
   * 6. Moves the editor caret to the bookmark position
   *
   * @param anchor - Bookmark name or fragment identifier (with or without leading '#')
   * @returns Promise resolving to true if navigation succeeded, false otherwise
   *
   * @remarks
   * Navigation fails and returns false if:
   * - The anchor parameter is empty or becomes empty after normalization
   * - No layout has been computed yet
   * - The bookmark does not exist in the document
   * - The bookmark's page cannot be determined
   * - The page fails to mount within the timeout period (2000ms)
   *
   * Note: This method does not throw errors. All failures are logged and result in
   * a false return value. An 'error' event is emitted for unhandled exceptions.
   *
   * @throws Never throws directly - errors are caught, logged, and emitted as events
   */
  async goToAnchor(anchor: string): Promise<boolean> {
    try {
      if (!anchor) return false;
      const layout = this.#layoutState.layout;
      if (!layout) return false;

      const normalized = anchor.startsWith('#') ? anchor.slice(1) : anchor;
      if (!normalized) return false;

      const pmPos = this.#layoutState.bookmarks.get(normalized);
      if (pmPos == null) return false;

      // Try to get exact position rect for precise scrolling
      const rects =
        selectionToRects(layout, this.#layoutState.blocks, this.#layoutState.measures, pmPos, pmPos + 1) ?? [];
      const rect = rects[0];

      // Find the page containing this position by scanning fragments
      // Bookmarks often fall in gaps between fragments (e.g., at page/section breaks),
      // so we also track the first fragment starting after the position as a fallback
      let pageIndex: number | null = rect?.pageIndex ?? null;

      if (pageIndex == null) {
        let nextFragmentPage: number | null = null;
        let nextFragmentStart: number | null = null;

        for (const page of layout.pages) {
          for (const fragment of page.fragments) {
            if (fragment.kind !== 'para') continue;
            const fragStart = fragment.pmStart;
            const fragEnd = fragment.pmEnd;
            if (fragStart == null || fragEnd == null) continue;

            // Exact match: position is within this fragment
            if (pmPos >= fragStart && pmPos < fragEnd) {
              pageIndex = page.number - 1;
              break;
            }

            // Track the first fragment that starts after our position
            if (fragStart > pmPos && (nextFragmentStart === null || fragStart < nextFragmentStart)) {
              nextFragmentPage = page.number - 1;
              nextFragmentStart = fragStart;
            }
          }
          if (pageIndex != null) break;
        }

        // Use the page of the next fragment if bookmark is in a gap
        if (pageIndex == null && nextFragmentPage != null) {
          pageIndex = nextFragmentPage;
        }
      }

      if (pageIndex == null) return false;

      // Scroll to the target page and wait for it to mount (virtualization)
      this.#scrollPageIntoView(pageIndex);
      await this.#waitForPageMount(pageIndex, { timeout: PresentationEditor.ANCHOR_NAV_TIMEOUT_MS });

      // Scroll the page element into view
      const pageEl = this.#painterHost?.querySelector(`[data-page-index="${pageIndex}"]`) as HTMLElement | null;
      if (pageEl) {
        pageEl.scrollIntoView({ behavior: 'instant', block: 'start' });
      }

      // Move caret to the bookmark position
      const activeEditor = this.getActiveEditor();
      if (activeEditor?.commands?.setTextSelection) {
        activeEditor.commands.setTextSelection({ from: pmPos, to: pmPos });
      } else {
        // Navigation succeeded visually (page scrolled), but caret positioning is unavailable
        // This is not an error - log a warning for debugging
        console.warn(
          '[PresentationEditor] goToAnchor: Navigation succeeded but could not move caret (editor commands unavailable)',
        );
      }

      return true;
    } catch (error) {
      console.error('[PresentationEditor] goToAnchor failed:', error);
      this.emit('error', {
        error,
        context: 'goToAnchor',
      });
      return false;
    }
  }

  /**
   * Waits for a page to be mounted in the DOM after scrolling.
   *
   * Polls for the page element using requestAnimationFrame until it appears
   * or the timeout is exceeded.
   *
   * @param pageIndex - Zero-based page index to wait for
   * @param options - Configuration options
   * @param options.timeout - Maximum time to wait in milliseconds (default: 2000)
   * @returns Promise that resolves to true if page was mounted, false if timeout
   */
  async #waitForPageMount(pageIndex: number, options: { timeout?: number } = {}): Promise<boolean> {
    const timeout = options.timeout ?? 2000;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const checkPage = () => {
        const pageElement = this.#getPageElement(pageIndex);
        if (pageElement) {
          resolve(true);
          return;
        }

        const elapsed = performance.now() - startTime;
        if (elapsed >= timeout) {
          resolve(false);
          return;
        }

        requestAnimationFrame(checkPage);
      };

      checkPage();
    });
  }

  #getBodyPageHeight() {
    return this.#layoutState.layout?.pageSize?.h ?? this.#layoutOptions.pageSize?.h ?? DEFAULT_PAGE_SIZE.h;
  }

  /**
   * Get the page height for the current header/footer context.
   * Returns the actual layout height from the header/footer context, or falls back to 1 if unavailable.
   * Used for correct coordinate mapping when rendering selections in header/footer mode.
   */
  #getHeaderFooterPageHeight(): number {
    const context = this.#getHeaderFooterContext();
    if (!context) {
      // Fallback to 1 if context is missing (should rarely happen)
      console.warn('[PresentationEditor] Header/footer context missing when computing page height');
      return 1;
    }
    // Use the actual page height from the header/footer layout
    return context.layout.pageSize?.h ?? context.region.height ?? 1;
  }

  /**
   * Applies DOM-based position correction to layout-computed selection rectangles.
   *
   * This method ensures selection highlights align with actual rendered text positions
   * by correcting for CSS effects (padding, text-indent, word-spacing) that the painter
   * applies but the layout engine doesn't account for. Without this correction, selection
   * highlights would be misaligned with the visible text.
   *
   * Algorithm:
   * 1. Calculate per-page delta between DOM and layout positions at selection start
   * 2. Apply horizontal and vertical deltas to all rectangles on the same page
   * 3. For the first rectangle, override with exact DOM start position
   * 4. For the last rectangle, compute width from DOM end position
   *
   * The correction is page-aware because multi-page selections may have different
   * rendering contexts on each page (e.g., different header/footer heights, column layouts).
   *
   * @param rects - Layout-computed selection rectangles to correct
   * @param domStart - DOM-measured start position {pageIndex, x, y} or null if unavailable
   * @param domEnd - DOM-measured end position {pageIndex, x, y} or null if unavailable
   * @returns Corrected selection rectangles with DOM-aligned positions
   *
   * @throws Never throws - gracefully handles null DOM positions by returning uncorrected rects
   */
  #applyDomCorrectionToRects(
    rects: LayoutRect[],
    domStart: { pageIndex: number; x: number; y: number } | null,
    domEnd: { pageIndex: number; x: number; y: number } | null,
  ): LayoutRect[] {
    if (rects.length === 0) return rects;

    // Compute per-page delta from DOM vs layout at the start position
    const pageDelta: Record<number, { dx: number; dy: number }> = {};
    if (domStart && rects[0] && domStart.pageIndex === rects[0].pageIndex) {
      const pageHeight = this.#getBodyPageHeight();
      const pageGap = this.#layoutState.layout?.pageGap ?? 0;
      const layoutY = rects[0].y - rects[0].pageIndex * (pageHeight + pageGap);
      pageDelta[domStart.pageIndex] = {
        dx: domStart.x - rects[0].x,
        dy: domStart.y - layoutY,
      };
    }

    return rects.map((rect, idx) => {
      const delta = pageDelta[rect.pageIndex];
      let adjustedX = delta ? rect.x + delta.dx : rect.x;
      let adjustedY = delta ? rect.y + delta.dy : rect.y;
      let adjustedWidth = rect.width;

      // For first rect, use DOM start position directly
      const isFirstRect = idx === 0;
      const isLastRect = idx === rects.length - 1;

      if (isFirstRect && domStart && rect.pageIndex === domStart.pageIndex) {
        const pageHeight = this.#getBodyPageHeight();
        const pageGap = this.#layoutState.layout?.pageGap ?? 0;
        adjustedX = domStart.x;
        adjustedY = domStart.y + rect.pageIndex * (pageHeight + pageGap);
      }

      // For last rect, compute width from DOM end position
      if (isLastRect && domEnd && rect.pageIndex === domEnd.pageIndex) {
        const endX = domEnd.x;
        adjustedWidth = Math.max(1, endX - adjustedX);
      }

      return {
        ...rect,
        x: adjustedX,
        y: adjustedY,
        width: adjustedWidth,
      };
    });
  }

  /**
   * Renders visual highlighting for CellSelection (multiple table cells selected).
   *
   * This method creates blue overlay rectangles for each selected cell in a table,
   * accounting for merged cells (colspan/rowspan), multi-page tables, and accurate
   * row/column positioning from layout measurements.
   *
   * Algorithm:
   * 1. Locate the table node by walking up the selection hierarchy
   * 2. Find the corresponding table block in layout state
   * 3. Collect all table fragments (tables can span multiple pages)
   * 4. Use TableMap to convert cell positions to row/column indices
   * 5. For each selected cell:
   *    - Find the fragment containing this cell's row
   *    - Look up column boundary information from fragment metadata
   *    - Calculate cell width (sum widths for colspan > 1)
   *    - Calculate cell height from row measurements (sum heights for rowspan > 1)
   *    - Convert page-local coordinates to overlay coordinates
   *    - Create and append highlight DOM element
   *
   * Edge cases handled:
   * - Tables spanning multiple pages (iterate all fragments)
   * - Merged cells (colspan and rowspan attributes)
   * - Missing measure data (fallback to estimated row heights)
   * - Invalid table structures (TableMap.get wrapped in try-catch)
   * - Cells outside fragment boundaries (skipped)
   *
   * @param selection - The CellSelection from ProseMirror tables plugin
   * @param layout - The current layout containing table fragments and measurements
   * @returns void - Renders directly to this.#localSelectionLayer
   * @private
   *
   * @throws Never throws - all errors are caught and logged, rendering gracefully degrades
   */
  #renderCellSelectionOverlay(selection: CellSelection, layout: Layout): void {
    const localSelectionLayer = this.#localSelectionLayer;
    if (!localSelectionLayer) {
      return;
    }

    // Validate input parameters
    if (!selection || !layout || !layout.pages) {
      console.warn('[renderCellSelectionOverlay] Invalid input parameters');
      return;
    }

    // Find the table node by walking up from the anchor cell
    const $anchorCell = selection.$anchorCell;
    if (!$anchorCell) {
      console.warn('[renderCellSelectionOverlay] No anchor cell in selection');
      return;
    }

    let tableDepth = $anchorCell.depth;
    while (tableDepth > 0 && $anchorCell.node(tableDepth).type.name !== 'table') {
      tableDepth--;
    }

    // Validate we found a table node
    if (tableDepth === 0 && $anchorCell.node(0).type.name !== 'table') {
      console.warn('[renderCellSelectionOverlay] Could not find table node in selection hierarchy');
      return;
    }

    const tableNode = $anchorCell.node(tableDepth);
    const tableStart = $anchorCell.start(tableDepth) - 1;

    // Find the corresponding table block in layout state
    let tableBlock: TableBlock | undefined;
    if (this.#cellAnchor?.tableBlockId) {
      tableBlock = this.#layoutState.blocks.find(
        (block) => block.kind === 'table' && block.id === this.#cellAnchor?.tableBlockId,
      ) as TableBlock | undefined;
    }
    if (!tableBlock) {
      const expectedBlockId = `${tableStart}-table`;
      tableBlock = this.#layoutState.blocks.find((block) => block.kind === 'table' && block.id === expectedBlockId) as
        | TableBlock
        | undefined;
    }
    if (!tableBlock) {
      const tableBlocks = this.#layoutState.blocks.filter((block) => block.kind === 'table') as TableBlock[];
      if (tableBlocks.length === 1) {
        tableBlock = tableBlocks[0];
      }
    }
    if (!tableBlock) {
      return;
    }

    // Find table fragments on all pages
    const tableFragments: Array<{ fragment: TableFragment; pageIndex: number }> = [];
    layout.pages.forEach((page, pageIndex) => {
      page.fragments.forEach((fragment) => {
        if (fragment.kind === 'table' && fragment.blockId === tableBlock.id) {
          tableFragments.push({ fragment: fragment as TableFragment, pageIndex });
        }
      });
    });
    if (tableFragments.length === 0) {
      return;
    }

    // Use TableMap to get accurate row/column positions for selected cells
    // Wrap TableMap.get in try-catch as it may throw on invalid table structures
    let tableMap;
    try {
      tableMap = TableMap.get(tableNode);
    } catch (error: unknown) {
      console.error('[renderCellSelectionOverlay] TableMap.get failed:', error);
      return;
    }

    const selectedCells: Array<{ row: number; col: number; colspan: number; rowspan: number }> = [];

    selection.forEachCell((cellNode, cellPos) => {
      const cellOffset = cellPos - tableStart - 1;
      const mapIndex = tableMap.map.indexOf(cellOffset);
      if (mapIndex === -1) {
        return;
      }

      const row = Math.floor(mapIndex / tableMap.width);
      const col = mapIndex % tableMap.width;
      // Type guard: Validate colspan and rowspan are positive numbers
      const rawColspan = cellNode.attrs?.colspan;
      const rawRowspan = cellNode.attrs?.rowspan;
      const colspan = typeof rawColspan === 'number' && Number.isFinite(rawColspan) && rawColspan > 0 ? rawColspan : 1;
      const rowspan = typeof rawRowspan === 'number' && Number.isFinite(rawRowspan) && rawRowspan > 0 ? rawRowspan : 1;

      selectedCells.push({ row, col, colspan, rowspan });
    });

    // Get row heights from table measure (measures array corresponds to blocks array by index)
    const tableBlockIndex = this.#layoutState.blocks.indexOf(tableBlock as FlowBlock);
    const measureAtIndex = tableBlockIndex !== -1 ? this.#layoutState.measures[tableBlockIndex] : undefined;
    const tableMeasure = measureAtIndex?.kind === 'table' ? (measureAtIndex as TableMeasure) : undefined;

    // Compute row Y positions from measure data
    const rowPositions: Array<{ y: number; height: number }> = [];
    if (tableMeasure?.rows) {
      let currentY = 0;
      for (const rowMeasure of tableMeasure.rows) {
        rowPositions.push({ y: currentY, height: rowMeasure.height });
        currentY += rowMeasure.height;
      }
    }

    // Render selection rectangles for each selected cell
    for (const { fragment, pageIndex } of tableFragments) {
      const { columnBoundaries } = fragment.metadata ?? {};
      if (!columnBoundaries) {
        continue;
      }

      for (const { row, col, colspan, rowspan } of selectedCells) {
        // Skip cells outside this fragment's row range
        if (row < fragment.fromRow || row >= fragment.toRow) {
          continue;
        }

        // Find column boundary
        const colBoundary = columnBoundaries.find((cb) => cb.index === col);
        if (!colBoundary) {
          continue;
        }

        // Calculate cell width (accounting for colspan)
        let cellWidth = colBoundary.width;
        if (colspan > 1) {
          for (let c = 1; c < colspan; c++) {
            const nextColBoundary = columnBoundaries.find((cb) => cb.index === col + c);
            if (nextColBoundary) {
              cellWidth += nextColBoundary.width;
            }
          }
        }

        // Calculate row Y position and height
        let rowY: number;
        let rowHeight: number;

        // Bounds check: Ensure row index is within valid range
        if (row >= 0 && row < rowPositions.length && rowPositions[row]) {
          // Use measure data - compute Y relative to fragment's first row
          const fragmentStartY =
            fragment.fromRow > 0 && fragment.fromRow < rowPositions.length && rowPositions[fragment.fromRow]
              ? rowPositions[fragment.fromRow].y
              : 0;
          rowY = rowPositions[row].y - fragmentStartY;
          rowHeight = rowPositions[row].height;

          // Account for rowspan with bounds checking
          if (rowspan > 1) {
            for (let r = 1; r < rowspan && row + r < rowPositions.length && rowPositions[row + r]; r++) {
              rowHeight += rowPositions[row + r].height;
            }
          }
        } else {
          // Fallback: estimate from fragment height
          const rowCount = fragment.toRow - fragment.fromRow;
          const estimatedRowHeight = rowCount > 0 ? fragment.height / rowCount : 20;
          const fragmentRelativeRow = row - fragment.fromRow;
          rowY = fragmentRelativeRow * estimatedRowHeight;
          rowHeight = estimatedRowHeight * rowspan;
        }

        // Compute cell rectangle in page-local coordinates
        const cellX = fragment.x + colBoundary.x;
        const cellY = fragment.y + rowY;

        // Convert to overlay coordinates
        const coords = this.#convertPageLocalToOverlayCoords(pageIndex, cellX, cellY);
        if (!coords) {
          continue;
        }

        // Create and append highlight element
        const highlight = localSelectionLayer.ownerDocument?.createElement('div');
        if (!highlight) {
          continue;
        }

        highlight.className = 'presentation-editor__cell-selection-rect';
        highlight.style.position = 'absolute';
        highlight.style.left = `${coords.x}px`;
        highlight.style.top = `${coords.y}px`;
        highlight.style.width = `${Math.max(1, cellWidth)}px`;
        highlight.style.height = `${Math.max(1, rowHeight)}px`;
        highlight.style.backgroundColor = 'rgba(51, 132, 255, 0.35)';
        highlight.style.pointerEvents = 'none';
        localSelectionLayer.appendChild(highlight);
      }
    }
  }

  #renderSelectionRects(rects: LayoutRect[]) {
    const localSelectionLayer = this.#localSelectionLayer;
    if (!localSelectionLayer) {
      return;
    }
    const pageHeight = this.#getBodyPageHeight();
    const pageGap = this.#layoutState.layout?.pageGap ?? 0;
    rects.forEach((rect) => {
      const pageLocalY = rect.y - rect.pageIndex * (pageHeight + pageGap);
      const coords = this.#convertPageLocalToOverlayCoords(rect.pageIndex, rect.x, pageLocalY);
      if (!coords) {
        return;
      }
      const highlight = localSelectionLayer.ownerDocument?.createElement('div');
      if (!highlight) {
        return;
      }
      highlight.className = 'presentation-editor__selection-rect';
      highlight.style.position = 'absolute';
      highlight.style.left = `${coords.x}px`;
      highlight.style.top = `${coords.y}px`;
      // Width and height are in layout space - the transform on #viewportHost handles scaling
      highlight.style.width = `${Math.max(1, rect.width)}px`;
      highlight.style.height = `${Math.max(1, rect.height)}px`;
      highlight.style.backgroundColor = 'rgba(51, 132, 255, 0.35)';
      highlight.style.borderRadius = '2px';
      highlight.style.pointerEvents = 'none';
      localSelectionLayer.appendChild(highlight);
    });
  }

  #renderHoverRegion(region: HeaderFooterRegion) {
    if (!this.#hoverOverlay || !this.#hoverTooltip) return;
    const coords = this.#convertPageLocalToOverlayCoords(region.pageIndex, region.localX, region.localY);
    if (!coords) {
      this.#clearHoverRegion();
      return;
    }
    this.#hoverOverlay.style.display = 'block';
    this.#hoverOverlay.style.left = `${coords.x}px`;
    this.#hoverOverlay.style.top = `${coords.y}px`;
    // Width and height are in layout space - the transform on #viewportHost handles scaling
    this.#hoverOverlay.style.width = `${region.width}px`;
    this.#hoverOverlay.style.height = `${region.height}px`;

    const tooltipText = `Double-click to edit ${region.kind === 'header' ? 'header' : 'footer'}`;
    this.#hoverTooltip.textContent = tooltipText;
    this.#hoverTooltip.style.display = 'block';
    this.#hoverTooltip.style.left = `${coords.x}px`;

    // Position tooltip above region by default, but below if too close to viewport top
    // This prevents clipping for headers at the top of the page
    const tooltipHeight = 24; // Approximate tooltip height
    const spaceAbove = coords.y;
    // Height is in layout space - the transform on #viewportHost handles scaling
    const regionHeight = region.height;
    const tooltipY =
      spaceAbove < tooltipHeight + 4
        ? coords.y + regionHeight + 4 // Position below if near top (with 4px spacing)
        : coords.y - tooltipHeight; // Position above otherwise
    this.#hoverTooltip.style.top = `${Math.max(0, tooltipY)}px`;
  }

  #clearHoverRegion() {
    this.#hoverRegion = null;
    if (this.#hoverOverlay) {
      this.#hoverOverlay.style.display = 'none';
    }
    if (this.#hoverTooltip) {
      this.#hoverTooltip.style.display = 'none';
    }
  }

  #renderCaretOverlay(caretLayout: { pageIndex: number; x: number; y: number; height: number }) {
    if (!this.#localSelectionLayer) {
      return;
    }
    const coords = this.#convertPageLocalToOverlayCoords(caretLayout.pageIndex, caretLayout.x, caretLayout.y);
    if (!coords) {
      return;
    }

    // Height is in layout space - the transform on #viewportHost handles scaling
    const finalHeight = Math.max(1, caretLayout.height);

    const caretEl = this.#localSelectionLayer.ownerDocument?.createElement('div');
    if (!caretEl) {
      return;
    }
    caretEl.className = 'presentation-editor__selection-caret';
    caretEl.style.position = 'absolute';
    caretEl.style.left = `${coords.x}px`;
    caretEl.style.top = `${coords.y}px`;
    caretEl.style.width = '2px';
    caretEl.style.height = `${finalHeight}px`;
    caretEl.style.backgroundColor = '#000000';
    caretEl.style.borderRadius = '1px';
    caretEl.style.pointerEvents = 'none';
    this.#localSelectionLayer.appendChild(caretEl);
  }

  #getHeaderFooterContext(): HeaderFooterLayoutContext | null {
    if (this.#session.mode === 'body') return null;
    if (!this.#headerFooterManager) return null;
    const pageIndex = this.#session.pageIndex;
    if (pageIndex == null) return null;
    const regionMap = this.#session.mode === 'header' ? this.#headerRegions : this.#footerRegions;
    const region = regionMap.get(pageIndex);
    if (!region) {
      console.warn('[PresentationEditor] Header/footer region not found for pageIndex:', pageIndex);
      return null;
    }
    const results = this.#session.mode === 'header' ? this.#headerLayoutResults : this.#footerLayoutResults;
    if (!results || results.length === 0) {
      console.warn('[PresentationEditor] Header/footer layout results not available');
      return null;
    }
    const variant = results.find((entry) => entry.type === this.#session.sectionType) ?? results[0] ?? null;
    if (!variant) {
      console.warn('[PresentationEditor] Header/footer variant not found for sectionType:', this.#session.sectionType);
      return null;
    }
    const pageWidth = Math.max(1, region.width);
    const pageHeight = Math.max(1, variant.layout.height ?? region.height ?? 1);
    const layoutLike: Layout = {
      pageSize: { w: pageWidth, h: pageHeight },
      pages: variant.layout.pages.map((page: Page) => ({
        number: page.number,
        numberText: page.numberText,
        fragments: page.fragments,
      })),
    };
    return {
      layout: layoutLike,
      blocks: variant.blocks,
      measures: variant.measures,
      region,
    };
  }

  #computeHeaderFooterSelectionRects(from: number, to: number): LayoutRect[] {
    const context = this.#getHeaderFooterContext();
    const bodyLayout = this.#layoutState.layout;
    if (!context) {
      // Warn when header/footer context is unavailable to aid debugging
      console.warn('[PresentationEditor] Header/footer context unavailable for selection rects', {
        mode: this.#session.mode,
        pageIndex: this.#session.pageIndex,
      });
      return [];
    }
    if (!bodyLayout) return [];
    const rects = selectionToRects(context.layout, context.blocks, context.measures, from, to) ?? [];
    const headerPageHeight = context.layout.pageSize?.h ?? context.region.height ?? 1;
    const bodyPageHeight = this.#getBodyPageHeight();
    return rects.map((rect: LayoutRect) => {
      const headerLocalY = rect.y - rect.pageIndex * headerPageHeight;
      return {
        pageIndex: context.region.pageIndex,
        x: rect.x + context.region.localX,
        y: context.region.pageIndex * bodyPageHeight + context.region.localY + headerLocalY,
        width: rect.width,
        height: rect.height,
      };
    });
  }

  #syncTrackedChangesPreferences(): boolean {
    const mode = this.#deriveTrackedChangesMode();
    const enabled = this.#deriveTrackedChangesEnabled();
    const hasChanged = mode !== this.#trackedChangesMode || enabled !== this.#trackedChangesEnabled;
    if (hasChanged) {
      this.#trackedChangesMode = mode;
      this.#trackedChangesEnabled = enabled;
    }
    return hasChanged;
  }

  #deriveTrackedChangesMode(): TrackedChangesMode {
    const overrideMode = this.#trackedChangesOverrides?.mode;
    if (overrideMode) {
      return overrideMode;
    }
    const pluginState = this.#getTrackChangesPluginState();
    if (pluginState?.onlyOriginalShown) {
      return 'original';
    }
    if (pluginState?.onlyModifiedShown) {
      return 'final';
    }
    if (this.#documentMode === 'viewing') {
      return 'final';
    }
    return 'review';
  }

  #deriveTrackedChangesEnabled(): boolean {
    if (typeof this.#trackedChangesOverrides?.enabled === 'boolean') {
      return this.#trackedChangesOverrides.enabled;
    }
    return true;
  }

  #getTrackChangesPluginState(): {
    isTrackChangesActive?: boolean;
    onlyOriginalShown?: boolean;
    onlyModifiedShown?: boolean;
  } | null {
    const state = this.#editor?.state;
    if (!state) return null;
    try {
      const pluginState = TrackChangesBasePluginKey.getState(state);
      return pluginState ?? null;
    } catch (error) {
      // Plugin may not be loaded or state may be invalid
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PresentationEditor] Failed to get track changes plugin state:', error);
      }
      return null;
    }
  }

  #computeDefaultLayoutDefaults(): {
    pageSize: PageSize;
    margins: PageMargins;
    columns?: ColumnLayout;
  } {
    const converter = this.#editor?.converter;
    const pageStyles = converter?.pageStyles ?? {};
    const size = pageStyles.pageSize ?? {};
    const pageMargins = pageStyles.pageMargins ?? {};

    const pageSize: PageSize = {
      w: this.#inchesToPx(size.width) ?? DEFAULT_PAGE_SIZE.w,
      h: this.#inchesToPx(size.height) ?? DEFAULT_PAGE_SIZE.h,
    };

    const margins: PageMargins = {
      top: this.#inchesToPx(pageMargins.top) ?? DEFAULT_MARGINS.top,
      right: this.#inchesToPx(pageMargins.right) ?? DEFAULT_MARGINS.right,
      bottom: this.#inchesToPx(pageMargins.bottom) ?? DEFAULT_MARGINS.bottom,
      left: this.#inchesToPx(pageMargins.left) ?? DEFAULT_MARGINS.left,
      ...(this.#inchesToPx(pageMargins.header) != null ? { header: this.#inchesToPx(pageMargins.header) } : {}),
      ...(this.#inchesToPx(pageMargins.footer) != null ? { footer: this.#inchesToPx(pageMargins.footer) } : {}),
    };

    const columns = this.#parseColumns(pageStyles.columns);
    return { pageSize, margins, columns };
  }

  #parseColumns(raw: unknown): ColumnLayout | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const columnSource = raw as Record<string, unknown>;
    const rawCount = Number(columnSource.count ?? columnSource.num ?? columnSource.numberOfColumns ?? 1);
    if (!Number.isFinite(rawCount) || rawCount <= 1) {
      return undefined;
    }
    const count = Math.max(1, Math.floor(rawCount));
    const gap = this.#inchesToPx(columnSource.space ?? columnSource.gap) ?? 0;
    return { count, gap };
  }

  #inchesToPx(value: unknown): number | undefined {
    if (value == null) return undefined;
    const num = Number(value);
    if (!Number.isFinite(num)) return undefined;
    return num * 96;
  }

  #applyZoom() {
    // Apply zoom via transform: scale() on #viewportHost.
    // This is the SINGLE source of zoom - the toolbar no longer applies CSS zoom on .layers.
    //
    // By applying transform on #viewportHost (which contains BOTH #painterHost AND #selectionOverlay),
    // both the rendered content and selection overlays scale together automatically.
    // This eliminates coordinate system mismatches that occurred when zoom was applied
    // externally on a parent element that didn't contain the selection overlay.
    const zoom = this.#layoutOptions.zoom ?? 1;
    this.#viewportHost.style.transformOrigin = 'top left';
    this.#viewportHost.style.transform = zoom === 1 ? '' : `scale(${zoom})`;
  }

  #createLayoutMetrics(
    perf: Performance | undefined,
    startMark: number | undefined,
    layout: Layout,
    blocks: FlowBlock[],
  ): LayoutMetrics | undefined {
    if (!perf || startMark == null || typeof perf.now !== 'function') {
      return undefined;
    }
    const durationMs = Math.max(0, perf.now() - startMark);
    return {
      durationMs,
      blockCount: blocks.length,
      pageCount: layout.pages?.length ?? 0,
    };
  }

  /**
   * Convert page-local coordinates to overlay-space coordinates.
   *
   * Transforms coordinates from page-local space (x, y relative to a specific page)
   * to overlay-space coordinates (absolute position within the stacked page layout).
   * The returned coordinates are in layout space (unscaled logical pixels), not screen
   * space - the CSS transform: scale() on #viewportHost handles zoom scaling.
   *
   * Pages are rendered vertically stacked at y = pageIndex * pageHeight, so the
   * conversion involves:
   * 1. X coordinate passes through unchanged (pages are horizontally aligned)
   * 2. Y coordinate is offset by (pageIndex * pageHeight) to account for stacking
   *
   * @param pageIndex - Zero-based page index (must be finite and non-negative)
   * @param pageLocalX - X coordinate relative to page origin (must be finite)
   * @param pageLocalY - Y coordinate relative to page origin (must be finite)
   * @returns Overlay coordinates {x, y} in layout space, or null if inputs are invalid
   *
   * @example
   * ```typescript
   * // Position at (50, 100) on page 2
   * const coords = this.#convertPageLocalToOverlayCoords(2, 50, 100);
   * // Returns: { x: 50, y: 2 * 792 + 100 } = { x: 50, y: 1684 }
   * ```
   *
   * @private
   */

  #getPageOffsetX(pageIndex: number): number | null {
    if (!this.#painterHost || !this.#viewportHost) {
      return null;
    }

    // Pages are horizontally centered inside the painter host. When the viewport is wider
    // than the page, the left offset must be included in overlay coordinates or selections
    // will appear shifted to the left of the rendered content.
    const pageEl = this.#painterHost.querySelector(
      `.superdoc-page[data-page-index="${pageIndex}"]`,
    ) as HTMLElement | null;
    if (!pageEl) return null;

    const pageRect = pageEl.getBoundingClientRect();
    const viewportRect = this.#viewportHost.getBoundingClientRect();
    const zoom = this.#layoutOptions.zoom ?? 1;

    // getBoundingClientRect includes the applied zoom transform; divide by zoom to return
    // layout-space units that match the rest of the overlay math.
    const offsetX = (pageRect.left - viewportRect.left) / zoom;

    return offsetX;
  }

  #convertPageLocalToOverlayCoords(
    pageIndex: number,
    pageLocalX: number,
    pageLocalY: number,
  ): { x: number; y: number } | null {
    // Validate pageIndex: must be finite and non-negative
    if (!Number.isFinite(pageIndex) || pageIndex < 0) {
      console.warn(
        `[PresentationEditor] #convertPageLocalToOverlayCoords: Invalid pageIndex ${pageIndex}. ` +
          'Expected a finite non-negative number.',
      );
      return null;
    }

    // Validate pageLocalX: must be finite
    if (!Number.isFinite(pageLocalX)) {
      console.warn(
        `[PresentationEditor] #convertPageLocalToOverlayCoords: Invalid pageLocalX ${pageLocalX}. ` +
          'Expected a finite number.',
      );
      return null;
    }

    // Validate pageLocalY: must be finite
    if (!Number.isFinite(pageLocalY)) {
      console.warn(
        `[PresentationEditor] #convertPageLocalToOverlayCoords: Invalid pageLocalY ${pageLocalY}. ` +
          'Expected a finite number.',
      );
      return null;
    }

    // Since zoom is now applied via transform: scale() on #viewportHost (which contains
    // BOTH #painterHost and #selectionOverlay), both are in the same coordinate system.
    // We position overlay elements in layout-space coordinates, and the transform handles scaling.
    //
    // Pages are rendered vertically stacked at y = pageIndex * (pageHeight + pageGap).
    // The page-local coordinates are already in layout space - just add the page stacking offset.
    const pageHeight = this.#layoutOptions.pageSize?.h ?? DEFAULT_PAGE_SIZE.h;
    const pageGap = this.#layoutState.layout?.pageGap ?? 0;
    const pageOffsetX = this.#getPageOffsetX(pageIndex) ?? 0;

    const coords = {
      x: pageOffsetX + pageLocalX,
      y: pageIndex * (pageHeight + pageGap) + pageLocalY,
    };

    return coords;
  }

  /**
   * Computes DOM-based caret position in page-local coordinates.
   *
   * This method queries the actual DOM to find the pixel-perfect caret position
   * for a given ProseMirror position. It's used as the source of truth for caret
   * rendering, as DOM measurements reflect the actual painted text (including CSS
   * effects like word-spacing, text-indent, and padding).
   *
   * Algorithm:
   * 1. Find all spans with data-pm-start and data-pm-end attributes
   * 2. Locate the span containing the target PM position
   * 3. Find the closest .superdoc-page ancestor to determine page context
   * 4. Create a DOM Range at the character index within the text node
   * 5. Measure the Range's bounding rect relative to the page
   * 6. Return page-local coordinates (adjusted for zoom)
   *
   * Fallback Behavior:
   * - If text node unavailable: Use span's bounding rect
   * - If no matching span found: Return null
   * - If page element not found: Return null
   *
   * Error Handling:
   * DOM operations can throw exceptions (invalid ranges, detached nodes, etc.).
   * Callers should wrap this method in try-catch to prevent crashes.
   *
   * @param pos - ProseMirror position to compute caret for
   * @returns Object with {pageIndex, x, y} in page-local coordinates, or null if DOM unavailable
   *
   * @throws May throw DOM exceptions (InvalidStateError, IndexSizeError) if DOM is in invalid state
   *
   * @example
   * ```typescript
   * try {
   *   const caretPos = this.#computeDomCaretPageLocal(42);
   *   if (caretPos) {
   *     // Render caret at caretPos.x, caretPos.y on page caretPos.pageIndex
   *   }
   * } catch (error) {
   *   console.warn('DOM caret computation failed:', error);
   *   // Fall back to geometry-based calculation
   * }
   * ```
   */
  #computeDomCaretPageLocal(pos: number): { pageIndex: number; x: number; y: number } | null {
    const pageEl = this.#viewportHost.querySelector(`.superdoc-page span[data-pm-start][data-pm-end]`)
      ? (this.#viewportHost.querySelector(`.superdoc-page`) as HTMLElement | null)
      : null;

    // Narrow search to matching page if possible
    const spans = Array.from(this.#viewportHost.querySelectorAll('span[data-pm-start][data-pm-end]')) as HTMLElement[];
    let targetSpan: HTMLElement | null = null;
    for (const span of spans) {
      const pmStart = Number(span.dataset.pmStart ?? 'NaN');
      const pmEnd = Number(span.dataset.pmEnd ?? 'NaN');
      if (!Number.isFinite(pmStart) || !Number.isFinite(pmEnd)) continue;
      if (pos < pmStart || pos > pmEnd) continue;
      targetSpan = span;
      break;
    }
    if (!targetSpan) return null;
    const page = targetSpan.closest('.superdoc-page') as HTMLElement | null;
    if (!page) return null;
    const pageRect = page.getBoundingClientRect();
    const zoom = this.#layoutOptions.zoom ?? 1;
    const textNode = targetSpan.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      const spanRect = targetSpan.getBoundingClientRect();
      return {
        pageIndex: Number(page.dataset.pageIndex ?? '0'),
        x: (spanRect.left - pageRect.left) / zoom,
        y: (spanRect.top - pageRect.top) / zoom,
      };
    }
    const pmStart = Number(targetSpan.dataset.pmStart ?? 'NaN');
    const charIndex = Math.min(pos - pmStart, textNode.length);
    const range = document.createRange();
    range.setStart(textNode, Math.max(0, charIndex));
    range.setEnd(textNode, Math.max(0, charIndex));
    const rangeRect = range.getBoundingClientRect();
    const lineEl = targetSpan.closest('.superdoc-line') as HTMLElement | null;
    const lineRect = lineEl?.getBoundingClientRect() ?? rangeRect;
    return {
      pageIndex: Number(page.dataset.pageIndex ?? '0'),
      x: (rangeRect.left - pageRect.left) / zoom,
      y: (lineRect.top - pageRect.top) / zoom,
    };
  }

  #normalizeClientPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }
    const rect = this.#viewportHost.getBoundingClientRect();
    // Zoom is now controlled centrally via this.#layoutOptions.zoom
    const zoom = this.#layoutOptions.zoom ?? 1;
    const scrollLeft = this.#visibleHost.scrollLeft ?? 0;
    const scrollTop = this.#visibleHost.scrollTop ?? 0;
    // Convert from screen coordinates to layout coordinates by dividing by zoom
    const baseX = (clientX - rect.left + scrollLeft) / zoom;
    const baseY = (clientY - rect.top + scrollTop) / zoom;

    // Adjust X by the actual page offset if the pointer is over a page. This keeps
    // geometry-based hit testing aligned with the centered page content.
    let adjustedX = baseX;
    const doc = this.#visibleHost.ownerDocument ?? document;
    const hitChain = typeof doc.elementsFromPoint === 'function' ? doc.elementsFromPoint(clientX, clientY) : [];
    const pageEl = Array.isArray(hitChain)
      ? (hitChain.find((el) => (el as HTMLElement)?.classList?.contains('superdoc-page')) as HTMLElement | null)
      : null;
    if (pageEl) {
      const pageIndex = Number(pageEl.dataset.pageIndex ?? 'NaN');
      if (Number.isFinite(pageIndex)) {
        const pageOffsetX = this.#getPageOffsetX(pageIndex);
        if (pageOffsetX != null) {
          adjustedX = baseX - pageOffsetX;
        }
      }
    }

    return {
      x: adjustedX,
      y: baseY,
    };
  }

  /**
   * Computes caret layout rectangle using geometry-based calculations.
   *
   * This method calculates the caret position and height from layout engine data
   * (fragments, blocks, measures) without querying the DOM. It's used as a fallback
   * when DOM-based measurements are unavailable or as a primary source in non-interactive
   * scenarios (e.g., headless rendering, PDF export).
   *
   * The geometry-based calculation accounts for:
   * - List markers (offset caret by marker width)
   * - Paragraph indents (left, right, first-line, hanging)
   * - Justified text alignment (extra space distributed across spaces)
   * - Multi-column layouts
   * - Table cell content
   *
   * Algorithm:
   * 1. Find the fragment containing the PM position
   * 2. Handle table fragments separately (delegate to #computeTableCaretLayoutRect)
   * 3. For paragraph fragments:
   *    a. Find the line containing the position
   *    b. Convert PM position to character offset
   *    c. Measure X coordinate using Canvas-based text measurement
   *    d. Apply marker width and indent adjustments
   *    e. Calculate Y offset from line heights
   *    f. Return page-local coordinates with line height
   *
   * @param pos - ProseMirror position to compute caret for
   * @param includeDomFallback - Whether to compare with DOM measurements for debugging (default: true).
   *   When true, logs geometry vs DOM deltas for analysis. Has no effect on return value.
   * @returns Object with {pageIndex, x, y, height} in page-local coordinates, or null if position not found
   *
   * @example
   * ```typescript
   * const caretGeometry = this.#computeCaretLayoutRectGeometry(42, false);
   * if (caretGeometry) {
   *   // Render caret at caretGeometry.x, caretGeometry.y with height caretGeometry.height
   * }
   * ```
   */
  #computeCaretLayoutRectGeometry(
    pos: number,
    includeDomFallback = true,
  ): { pageIndex: number; x: number; y: number; height: number } | null {
    const layout = this.#layoutState.layout;
    if (!layout) return null;

    // Geometry-based calculation from layout engine
    const hit = getFragmentAtPosition(layout, this.#layoutState.blocks, this.#layoutState.measures, pos);
    if (!hit) {
      return null;
    }
    const block = hit.block;
    const measure = hit.measure;

    // Handle table fragments
    if (hit.fragment.kind === 'table' && block?.kind === 'table' && measure?.kind === 'table') {
      return this.#computeTableCaretLayoutRect(
        pos,
        hit.fragment as TableFragment,
        block as TableBlock,
        measure as TableMeasure,
        hit.pageIndex,
      );
    }

    if (!block || block.kind !== 'paragraph' || measure?.kind !== 'paragraph') return null;
    if (hit.fragment.kind !== 'para') {
      return null;
    }
    const fragment: ParaFragment = hit.fragment;

    const lineInfo = this.#findLineContainingPos(block, measure, fragment.fromLine, fragment.toLine, pos);
    if (!lineInfo) {
      return null;
    }
    const { line, index } = lineInfo;
    const range = computeLinePmRange(block, line);
    if (range.pmStart == null || range.pmEnd == null) return null;

    // Calculate character offset from PM position using layout-aware mapping (accounts for PM gaps)
    const pmOffset = pmPosToCharOffset(block, line, pos);

    // Account for list marker width - this matches selectionToRects behavior
    const markerWidth = fragment.markerWidth ?? measure.marker?.markerWidth ?? 0;
    const paraIndentLeft = block.attrs?.indent?.left ?? 0;
    const paraIndentRight = block.attrs?.indent?.right ?? 0;
    const availableWidth = Math.max(0, fragment.width - (paraIndentLeft + paraIndentRight));
    const charX = measureCharacterX(block, line, pmOffset, availableWidth);
    // Align with painter DOM indent handling: add paragraph indent (left) and first-line offset when applicable
    // The painter applies indent to ALL non-list lines (both segment-based and regular)
    const firstLineOffset = (block.attrs?.indent?.firstLine ?? 0) - (block.attrs?.indent?.hanging ?? 0);
    const isFirstLine = index === fragment.fromLine;
    const isListFirstLine = isFirstLine && !fragment.continuesFromPrev && (fragment.markerWidth ?? 0) > 0;
    let indentAdjust = 0;
    if (!isListFirstLine) {
      indentAdjust = paraIndentLeft + (isFirstLine ? firstLineOffset : 0);
    }

    const localX = fragment.x + markerWidth + indentAdjust + charX;
    const lineOffset = this.#lineHeightBeforeIndex(measure.lines, fragment.fromLine, index);
    const localY = fragment.y + lineOffset;

    const result = {
      pageIndex: hit.pageIndex,
      x: localX,
      y: localY,
      height: line.lineHeight,
    };

    // DEBUG: Log layout engine caret calculation + compare to DOM
    const pageEl = this.#painterHost?.querySelector(
      `.superdoc-page[data-page-index="${hit.pageIndex}"]`,
    ) as HTMLElement | null;
    const pageRect = pageEl?.getBoundingClientRect();
    const zoom = this.#layoutOptions.zoom ?? 1;

    // Find span containing this pos and measure actual DOM position
    let domCaretX: number | null = null;
    let domCaretY: number | null = null;
    const spanEls = pageEl?.querySelectorAll('span[data-pm-start][data-pm-end]') ?? [];
    for (const spanEl of spanEls) {
      const pmStart = Number((spanEl as HTMLElement).dataset.pmStart);
      const pmEnd = Number((spanEl as HTMLElement).dataset.pmEnd);
      if (pos >= pmStart && pos <= pmEnd && spanEl.firstChild?.nodeType === Node.TEXT_NODE) {
        const textNode = spanEl.firstChild as Text;
        const charIndex = Math.min(pos - pmStart, textNode.length);
        const rangeObj = document.createRange();
        rangeObj.setStart(textNode, charIndex);
        rangeObj.setEnd(textNode, charIndex);
        const rangeRect = rangeObj.getBoundingClientRect();
        if (pageRect) {
          domCaretX = (rangeRect.left - pageRect.left) / zoom;
          domCaretY = (rangeRect.top - pageRect.top) / zoom;
        }
        break;
      }
    }

    // If we found a DOM caret position, prefer it to avoid residual drift
    if (includeDomFallback && domCaretX != null && domCaretY != null) {
      return {
        pageIndex: hit.pageIndex,
        x: domCaretX,
        y: domCaretY,
        height: line.lineHeight,
      };
    }

    return result;
  }

  /**
   * Compute caret position, preferring DOM when available, falling back to geometry.
   */
  #computeCaretLayoutRect(pos: number): { pageIndex: number; x: number; y: number; height: number } | null {
    const geometry = this.#computeCaretLayoutRectGeometry(pos, true);
    let dom: { pageIndex: number; x: number; y: number } | null = null;
    try {
      dom = this.#computeDomCaretPageLocal(pos);
    } catch (error) {
      // DOM operations can throw exceptions - fall back to geometry-only positioning
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PresentationEditor] DOM caret computation failed in #computeCaretLayoutRect:', error);
      }
    }
    if (dom && geometry) {
      return {
        pageIndex: dom.pageIndex,
        x: dom.x,
        y: dom.y,
        height: geometry.height,
      };
    }
    return geometry;
  }

  /**
   * DEPRECATED: Computes caret position using DOM-based positioning.
   *
   * This method is NO LONGER USED as of the fix for overlay positioning with external transforms.
   * It uses getBoundingClientRect() which returns viewport coordinates affected by external
   * transforms, causing caret drift when SuperDoc is embedded in containers with CSS transforms.
   *
   * Kept for reference only. Use layout engine geometry instead (see #computeCaretLayoutRect).
   *
   * @deprecated Use layout engine geometry directly - this method is incompatible with external transforms
   * @private
   */
  // eslint-disable-next-line no-unused-private-class-members
  #computeCaretLayoutRectFromDOM(pos: number): { pageIndex: number; x: number; y: number; height: number } | null {
    // Optimization: Try to find the specific page containing this position
    // This narrows the DOM query scope significantly for large documents
    let targetPageEl: HTMLElement | null = null;
    if (this.#layoutState.layout && this.#layoutState.blocks && this.#layoutState.measures) {
      const fragmentHit = getFragmentAtPosition(
        this.#layoutState.layout,
        this.#layoutState.blocks,
        this.#layoutState.measures,
        pos,
      );
      if (fragmentHit) {
        const pageEl = this.#viewportHost.querySelector(
          `.superdoc-page[data-page-index="${fragmentHit.pageIndex}"]`,
        ) as HTMLElement | null;
        if (pageEl) {
          targetPageEl = pageEl;
        }
      }
    }

    // Query spans - prefer narrowed scope if we found the page, fallback to viewport-wide query
    // Exclude inline SDT wrapper elements - they have PM positions for selection highlighting but their
    // child spans should be the targets for accurate character-level caret positioning
    const spanEls = Array.from(
      targetPageEl
        ? targetPageEl.querySelectorAll(`span[data-pm-start][data-pm-end]:not(.${DOM_CLASS_NAMES.INLINE_SDT_WRAPPER})`)
        : this.#viewportHost.querySelectorAll(
            `span[data-pm-start][data-pm-end]:not(.${DOM_CLASS_NAMES.INLINE_SDT_WRAPPER})`,
          ),
    );

    for (const spanEl of spanEls) {
      const pmStart = Number((spanEl as HTMLElement).dataset.pmStart ?? 'NaN');
      const pmEnd = Number((spanEl as HTMLElement).dataset.pmEnd ?? 'NaN');

      if (!Number.isFinite(pmStart) || !Number.isFinite(pmEnd)) continue;
      if (pos < pmStart || pos > pmEnd) continue;

      // Found the span containing this position
      // Get the page element to compute page-local coordinates
      const pageEl = spanEl.closest('.superdoc-page') as HTMLElement | null;
      if (!pageEl) continue;

      const pageIndex = Number(pageEl.dataset.pageIndex ?? '0');
      const pageRect = pageEl.getBoundingClientRect();

      // Get zoom to convert from viewport space (scaled) to layout space (logical pixels)
      // The #viewportHost has transform: scale(zoom), so getBoundingClientRect() returns
      // viewport coordinates. We need to divide differences by zoom to get layout coordinates.
      const zoom = this.#layoutOptions.zoom ?? 1;

      // Use Range API to get exact character position within the span
      const textNode = spanEl.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
        // No text node - return span start position
        const spanRect = spanEl.getBoundingClientRect();

        // Compute relative offset in viewport space, then convert to layout space
        // Both pageRect and spanRect are in the same transformed hierarchy, so we can subtract
        // them, but the result is in viewport pixels and must be divided by zoom to get layout pixels
        return {
          pageIndex,
          x: (spanRect.left - pageRect.left) / zoom,
          y: (spanRect.top - pageRect.top) / zoom,
          height: spanRect.height / zoom,
        };
      }

      // Use Range to find exact character position
      const text = textNode.textContent ?? '';
      const charOffset = Math.max(0, Math.min(text.length, pos - pmStart));

      const range = document.createRange();
      try {
        range.setStart(textNode, charOffset);
        range.setEnd(textNode, charOffset);
      } catch (error) {
        // Range creation failed - this can happen if charOffset exceeds text length
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PresentationEditor] Range.setStart/setEnd failed:', {
            error: error instanceof Error ? error.message : String(error),
            charOffset,
            textLength: text.length,
            pos,
            pmStart,
            pmEnd,
          });
        }

        // Fall back to span position
        const spanRect = spanEl.getBoundingClientRect();

        return {
          pageIndex,
          x: (spanRect.left - pageRect.left) / zoom,
          y: (spanRect.top - pageRect.top) / zoom,
          height: spanRect.height / zoom,
        };
      }

      const rangeRect = range.getBoundingClientRect();

      // Get span height for caret (matches font/text size, not full line height)
      const spanRect = spanEl.getBoundingClientRect();

      // Center the caret vertically within the line if line is taller than text
      const lineEl = spanEl.closest('.superdoc-line');
      const lineRect = lineEl ? (lineEl as HTMLElement).getBoundingClientRect() : spanRect;

      // Use span height for caret, but position it vertically centered in the line
      const caretHeight = spanRect.height;
      const verticalOffset = (lineRect.height - caretHeight) / 2;
      const caretY = lineRect.top + verticalOffset;

      // Return page-local coordinates in layout space
      // We compute differences in viewport space (both rects are scaled by transform),
      // then divide by zoom to convert to layout space
      return {
        pageIndex,
        x: (rangeRect.left - pageRect.left) / zoom,
        y: (caretY - pageRect.top) / zoom,
        height: caretHeight / zoom,
      };
    }

    return null;
  }

  /**
   * DEPRECATED: Computes caret position within a table cell using DOM-based positioning.
   *
   * This method is NO LONGER USED as the parent #computeCaretLayoutRect now uses layout
   * engine geometry exclusively to avoid issues with external transforms.
   *
   * Kept for reference only.
   *
   * @deprecated Use layout engine geometry - this method is incompatible with external transforms
   * @private
   */

  #computeTableCaretLayoutRect(
    pos: number,
    _fragment: TableFragment,
    _tableBlock: TableBlock,
    _tableMeasure: TableMeasure,
    pageIndex: number,
  ): { pageIndex: number; x: number; y: number; height: number } | null {
    // Use DOM-based positioning for accuracy (matching how click mapping works)
    // Find the line element with data-pm-start/end that contains this position
    const lineEls = Array.from(this.#viewportHost.querySelectorAll('.superdoc-line'));

    // Early return if DOM not yet rendered
    if (lineEls.length === 0) return null;

    for (const lineEl of lineEls) {
      const pmStart = Number((lineEl as HTMLElement).dataset.pmStart ?? 'NaN');
      const pmEnd = Number((lineEl as HTMLElement).dataset.pmEnd ?? 'NaN');

      if (!Number.isFinite(pmStart) || !Number.isFinite(pmEnd)) continue;
      if (pos < pmStart || pos > pmEnd) continue;

      // Found the line containing this position
      // Now find the span containing the position
      const spanEls = Array.from(lineEl.querySelectorAll('span[data-pm-start]'));

      for (const spanEl of spanEls) {
        const spanStart = Number((spanEl as HTMLElement).dataset.pmStart ?? 'NaN');
        const spanEnd = Number((spanEl as HTMLElement).dataset.pmEnd ?? 'NaN');

        if (!Number.isFinite(spanStart) || !Number.isFinite(spanEnd)) continue;
        if (pos < spanStart || pos > spanEnd) continue;

        // Found the span - use Range API to get exact character position
        const textNode = spanEl.firstChild;
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
          // No text node - return span start position
          const spanRect = spanEl.getBoundingClientRect();
          const viewportRect = this.#viewportHost.getBoundingClientRect();
          const zoom = this.#layoutOptions.zoom ?? 1;

          return {
            pageIndex,
            x: (spanRect.left - viewportRect.left + this.#visibleHost.scrollLeft) / zoom,
            y: (spanRect.top - viewportRect.top + this.#visibleHost.scrollTop) / zoom,
            height: spanRect.height / zoom,
          };
        }

        // Use Range to find exact character position
        const text = textNode.textContent ?? '';
        const charOffset = Math.max(0, Math.min(text.length, pos - spanStart));

        const range = document.createRange();
        range.setStart(textNode, charOffset);
        range.setEnd(textNode, charOffset);

        const rangeRect = range.getBoundingClientRect();
        const viewportRect = this.#viewportHost.getBoundingClientRect();
        const zoom = this.#layoutOptions.zoom ?? 1;
        const lineRect = lineEl.getBoundingClientRect();

        return {
          pageIndex,
          x: (rangeRect.left - viewportRect.left + this.#visibleHost.scrollLeft) / zoom,
          y: (lineRect.top - viewportRect.top + this.#visibleHost.scrollTop) / zoom,
          height: lineRect.height / zoom,
        };
      }

      // Position is in line but no matching span - return line start
      const lineRect = (lineEl as HTMLElement).getBoundingClientRect();
      const viewportRect = this.#viewportHost.getBoundingClientRect();
      const zoom = this.#layoutOptions.zoom ?? 1;

      return {
        pageIndex,
        x: (lineRect.left - viewportRect.left + this.#visibleHost.scrollLeft) / zoom,
        y: (lineRect.top - viewportRect.top + this.#visibleHost.scrollTop) / zoom,
        height: lineRect.height / zoom,
      };
    }

    return null;
  }

  #findLineContainingPos(
    block: FlowBlock,
    measure: Measure,
    fromLine: number,
    toLine: number,
    pos: number,
  ): { line: Line; index: number } | null {
    if (measure.kind !== 'paragraph' || block.kind !== 'paragraph') return null;
    for (let lineIndex = fromLine; lineIndex < toLine; lineIndex += 1) {
      const line = measure.lines[lineIndex];
      if (!line) continue;
      const range = computeLinePmRange(block, line);
      if (range.pmStart == null || range.pmEnd == null) continue;
      if (pos >= range.pmStart && pos <= range.pmEnd) {
        return { line, index: lineIndex };
      }
    }
    return null;
  }

  #lineHeightBeforeIndex(lines: Line[], fromLine: number, targetIndex: number): number {
    let offset = 0;
    for (let i = fromLine; i < targetIndex; i += 1) {
      offset += lines[i]?.lineHeight ?? 0;
    }
    return offset;
  }

  #getCurrentPageIndex(): number {
    if (this.#session.mode !== 'body') {
      return this.#session.pageIndex ?? 0;
    }
    const layout = this.#layoutState.layout;
    const selection = this.#editor.state?.selection;
    if (!layout || !selection) {
      return 0;
    }

    // Try selectionToRects first
    const rects =
      selectionToRects(layout, this.#layoutState.blocks, this.#layoutState.measures, selection.from, selection.to) ??
      [];

    if (rects.length > 0) {
      return rects[0]?.pageIndex ?? 0;
    }

    // Fallback: scan pages to find which one contains this position via fragments
    // Note: pmStart/pmEnd are only present on some fragment types (ParaFragment, ImageFragment, DrawingFragment)
    const pos = selection.from;
    for (let pageIdx = 0; pageIdx < layout.pages.length; pageIdx++) {
      const page = layout.pages[pageIdx];
      for (const fragment of page.fragments) {
        const frag = fragment as { pmStart?: number; pmEnd?: number };
        if (frag.pmStart != null && frag.pmEnd != null) {
          if (pos >= frag.pmStart && pos <= frag.pmEnd) {
            return pageIdx;
          }
        }
      }
    }

    return 0;
  }

  #findRegionForPage(kind: 'header' | 'footer', pageIndex: number): HeaderFooterRegion | null {
    const map = kind === 'header' ? this.#headerRegions : this.#footerRegions;
    return map.get(pageIndex) ?? map.values().next().value ?? null;
  }

  #handleLayoutError(phase: LayoutError['phase'], error: Error) {
    console.error('[PresentationEditor] Layout error', error);
    this.#layoutError = { phase, error, timestamp: Date.now() };

    // Update error state based on phase
    if (phase === 'initialization') {
      this.#layoutErrorState = 'failed'; // Fatal error during init
    } else {
      // Render errors may be recoverable
      this.#layoutErrorState = this.#layoutState.layout ? 'degraded' : 'failed';
    }

    this.emit('layoutError', this.#layoutError);
    if (this.#telemetryEmitter) {
      this.#telemetryEmitter({ type: 'error', data: this.#layoutError });
    }
    this.#showLayoutErrorBanner(error);
  }

  #decorateError(error: unknown, stage: string): Error {
    if (error instanceof Error) {
      error.message = `[${stage}] ${error.message}`;
      return error;
    }
    return new Error(`[${stage}] ${String(error)}`);
  }

  #showLayoutErrorBanner(error: Error) {
    const doc = this.#visibleHost.ownerDocument ?? document;
    if (!this.#errorBanner) {
      const banner = doc.createElement('div');
      banner.className = 'presentation-editor__layout-error';
      banner.style.display = 'flex';
      banner.style.alignItems = 'center';
      banner.style.justifyContent = 'space-between';
      banner.style.gap = '8px';
      banner.style.padding = '8px 12px';
      banner.style.background = '#FFF6E5';
      banner.style.border = '1px solid #F5B971';
      banner.style.borderRadius = '6px';
      banner.style.marginBottom = '8px';

      const message = doc.createElement('span');
      banner.appendChild(message);

      const retry = doc.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Reload layout';
      retry.style.border = 'none';
      retry.style.borderRadius = '4px';
      retry.style.background = '#F5B971';
      retry.style.color = '#3F2D00';
      retry.style.padding = '6px 10px';
      retry.style.cursor = 'pointer';
      retry.addEventListener('click', () => {
        this.#layoutError = null;
        this.#dismissErrorBanner();
        this.#pendingDocChange = true;
        this.#scheduleRerender();
      });

      banner.appendChild(retry);
      this.#visibleHost.prepend(banner);

      this.#errorBanner = banner;
      this.#errorBannerMessage = message;
    }

    if (this.#errorBannerMessage) {
      this.#errorBannerMessage.textContent =
        'Layout engine hit an error. Your document is safe — try reloading layout.';
      if (this.#layoutOptions.debugLabel) {
        this.#errorBannerMessage.textContent += ` (${this.#layoutOptions.debugLabel}: ${error.message})`;
      }
    }
  }

  #dismissErrorBanner() {
    this.#errorBanner?.remove();
    this.#errorBanner = null;
    this.#errorBannerMessage = null;
  }

  #createHiddenHost(doc: Document): HTMLElement {
    const host = doc.createElement('div');
    host.className = 'presentation-editor__hidden-host';
    host.style.position = 'absolute';
    host.style.left = '-9999px';
    host.style.top = '0';
    host.style.width = `${this.#layoutOptions.pageSize?.w ?? DEFAULT_PAGE_SIZE.w}px`;
    host.style.pointerEvents = 'none';
    // DO NOT use visibility:hidden - it prevents focusing!
    // Instead use opacity:0 and z-index to hide while keeping focusable
    host.style.opacity = '0';
    host.style.zIndex = '-1';
    host.style.userSelect = 'none';
    // DO NOT set aria-hidden="true" on this element.
    // This hidden host contains the actual ProseMirror editor which must remain accessible
    // to screen readers and keyboard navigation. The viewport (#viewportHost) is aria-hidden
    // because it's purely visual, but this editor provides the semantic document structure.
    return host;
  }
}

class PresentationInputBridge {
  #windowRoot: Window;
  #layoutSurfaces: Set<EventTarget>;
  #getTargetDom: () => HTMLElement | null;
  /** Callback that returns whether the editor is in an editable mode (editing/suggesting vs viewing) */
  #isEditable: () => boolean;
  #onTargetChanged?: (target: HTMLElement | null) => void;
  #listeners: Array<{ type: string; handler: EventListener; target: EventTarget; useCapture: boolean }>;
  #currentTarget: HTMLElement | null = null;
  #destroyed = false;
  #useWindowFallback: boolean;

  /**
   * Creates a new PresentationInputBridge that forwards user input events from the visible layout
   * surface to the hidden editor DOM. This enables input handling when the actual editor is not
   * directly visible to the user.
   *
   * @param windowRoot - The window object containing the layout surface and editor target
   * @param layoutSurface - The visible HTML element that receives user input events (e.g., keyboard, mouse)
   * @param getTargetDom - Callback that returns the hidden editor's DOM element where events should be forwarded
   * @param isEditable - Callback that returns whether the editor is in an editable mode (editing/suggesting).
   *                     When this returns false (e.g., in viewing mode), keyboard, text, and composition
   *                     events will not be forwarded to prevent document modification.
   * @param onTargetChanged - Optional callback invoked when the target editor DOM element changes
   * @param options - Optional configuration including:
   *                  - useWindowFallback: Whether to attach window-level event listeners as fallback
   */
  constructor(
    windowRoot: Window,
    layoutSurface: HTMLElement,
    getTargetDom: () => HTMLElement | null,
    isEditable: () => boolean,
    onTargetChanged?: (target: HTMLElement | null) => void,
    options?: { useWindowFallback?: boolean },
  ) {
    this.#windowRoot = windowRoot;
    this.#layoutSurfaces = new Set<EventTarget>([layoutSurface]);
    this.#getTargetDom = getTargetDom;
    this.#isEditable = isEditable;
    this.#onTargetChanged = onTargetChanged;
    this.#listeners = [];
    this.#useWindowFallback = options?.useWindowFallback ?? false;
  }

  bind() {
    const keyboardTargets = this.#getListenerTargets();
    keyboardTargets.forEach((target) => {
      this.#addListener('keydown', this.#forwardKeyboardEvent, target);
      this.#addListener('keyup', this.#forwardKeyboardEvent, target);
    });

    const compositionTargets = this.#getListenerTargets();
    compositionTargets.forEach((target) => {
      this.#addListener('compositionstart', this.#forwardCompositionEvent, target);
      this.#addListener('compositionupdate', this.#forwardCompositionEvent, target);
      this.#addListener('compositionend', this.#forwardCompositionEvent, target);
    });

    const textTargets = this.#getListenerTargets();
    textTargets.forEach((target) => {
      this.#addListener('beforeinput', this.#forwardTextEvent, target);
      this.#addListener('input', this.#forwardTextEvent, target);
      this.#addListener('textInput', this.#forwardTextEvent, target);
    });

    const contextTargets = this.#getListenerTargets();
    contextTargets.forEach((target) => {
      this.#addListener('contextmenu', this.#forwardContextMenu, target);
    });
  }

  destroy() {
    this.#listeners.forEach(({ type, handler, target, useCapture }) => {
      target.removeEventListener(type, handler, useCapture);
    });
    this.#listeners = [];
    this.#currentTarget = null;
    this.#destroyed = true;
  }

  notifyTargetChanged() {
    if (this.#destroyed) {
      return;
    }
    const nextTarget = this.#getTargetDom();
    if (nextTarget === this.#currentTarget) {
      return;
    }
    if (this.#currentTarget) {
      let synthetic: Event | null = null;
      if (typeof CompositionEvent !== 'undefined') {
        // Fire compositionend with empty data to complete any active composition.
        // Note: Empty string is the standard value for compositionend - it signals
        // that composition input is complete, not that the composed text is empty.
        // This ensures IME state is properly cleared when switching edit targets.
        synthetic = new CompositionEvent('compositionend', { data: '', bubbles: true, cancelable: true });
      } else {
        synthetic = new Event('compositionend', { bubbles: true, cancelable: true });
      }
      try {
        this.#currentTarget.dispatchEvent(synthetic);
      } catch (error) {
        // Ignore dispatch failures - can happen if target was removed from DOM
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PresentationEditor] Failed to dispatch composition event:', error);
        }
      }
    }
    this.#currentTarget = nextTarget;
    this.#onTargetChanged?.(nextTarget ?? null);
  }

  #addListener<T extends Event>(type: string, handler: (event: T) => void, target: EventTarget, useCapture = false) {
    const bound = handler.bind(this) as EventListener;
    this.#listeners.push({ type, handler: bound, target, useCapture });
    target.addEventListener(type, bound, useCapture);
  }

  #dispatchToTarget(originalEvent: Event, synthetic: Event) {
    if (this.#destroyed) return;
    const target = this.#getTargetDom();
    this.#currentTarget = target;
    if (!target) return;
    const isConnected = (target as { isConnected?: boolean }).isConnected;
    if (isConnected === false) return;
    try {
      const canceled = !target.dispatchEvent(synthetic) || synthetic.defaultPrevented;
      if (canceled) {
        originalEvent.preventDefault();
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PresentationEditor] Failed to dispatch event to target:', error);
      }
    }
  }

  /**
   * Forwards keyboard events to the hidden editor, skipping IME composition events
   * and plain character keys (which are handled by beforeinput instead).
   * Uses microtask deferral to allow other handlers to preventDefault first.
   *
   * @param event - The keyboard event from the layout surface
   */
  #forwardKeyboardEvent(event: KeyboardEvent) {
    if (!this.#isEditable()) {
      return;
    }
    if (this.#shouldSkipSurface(event)) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    if (event.isComposing || event.keyCode === 229) {
      return;
    }
    if (this.#isPlainCharacterKey(event)) {
      return;
    }

    // Dispatch synchronously so browser defaults can still be prevented
    const synthetic = new KeyboardEvent(event.type, {
      key: event.key,
      code: event.code,
      location: event.location,
      repeat: event.repeat,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      bubbles: true,
      cancelable: true,
    });
    this.#dispatchToTarget(event, synthetic);
  }

  /**
   * Forwards text input events (beforeinput) to the hidden editor.
   * Skips composition events and uses microtask deferral for cooperative handling.
   *
   * @param event - The input event from the layout surface
   */
  #forwardTextEvent(event: InputEvent | TextEvent) {
    if (!this.#isEditable()) {
      return;
    }
    if (this.#shouldSkipSurface(event)) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    if ((event as InputEvent).isComposing) {
      return;
    }

    queueMicrotask(() => {
      // Only re-check mutable state - surface check was already done
      if (event.defaultPrevented) {
        return;
      }

      let synthetic: Event;
      if (typeof InputEvent !== 'undefined') {
        synthetic = new InputEvent(event.type, {
          data: (event as InputEvent).data ?? (event as TextEvent).data ?? null,
          inputType: (event as InputEvent).inputType ?? 'insertText',
          dataTransfer: (event as InputEvent).dataTransfer ?? null,
          isComposing: (event as InputEvent).isComposing ?? false,
          bubbles: true,
          cancelable: true,
        });
      } else {
        synthetic = new Event(event.type, { bubbles: true, cancelable: true });
      }
      this.#dispatchToTarget(event, synthetic);
    });
  }

  /**
   * Forwards composition events (compositionstart, compositionupdate, compositionend)
   * to the hidden editor for IME input handling.
   *
   * @param event - The composition event from the layout surface
   */
  #forwardCompositionEvent(event: CompositionEvent) {
    if (!this.#isEditable()) {
      return;
    }
    if (this.#shouldSkipSurface(event)) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }

    let synthetic: Event;
    if (typeof CompositionEvent !== 'undefined') {
      synthetic = new CompositionEvent(event.type, {
        data: event.data ?? '',
        bubbles: true,
        cancelable: true,
      });
    } else {
      synthetic = new Event(event.type, { bubbles: true, cancelable: true });
    }
    this.#dispatchToTarget(event, synthetic);
  }

  /**
   * Forwards context menu events to the hidden editor.
   *
   * @param event - The context menu event from the layout surface
   */
  #forwardContextMenu(event: MouseEvent) {
    if (!this.#isEditable()) {
      return;
    }
    if (this.#shouldSkipSurface(event)) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    const synthetic = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      button: event.button,
      buttons: event.buttons,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    });
    this.#dispatchToTarget(event, synthetic);
  }

  #isEventOnActiveTarget(event: Event): boolean {
    const targetDom = this.#getTargetDom();
    if (!targetDom) return false;
    const origin = event.target as Node | null;
    if (!origin) return false;
    const targetNode = targetDom as unknown as Node;
    const containsFn =
      typeof (targetNode as { contains?: (node: Node | null) => boolean }).contains === 'function'
        ? (targetNode as { contains: (node: Node | null) => boolean }).contains
        : null;
    if (targetNode === origin) {
      return true;
    }
    if (containsFn) {
      return containsFn.call(targetNode, origin);
    }
    return false;
  }

  /**
   * Determines if an event originated from a UI surface that should be excluded
   * from keyboard forwarding (e.g., toolbars, dropdowns).
   *
   * Checks three conditions in order:
   * 1. Event is already on the active target (hidden editor) - skip to prevent loops
   * 2. Event is not in a layout surface - skip non-editor events
   * 3. Event is in a registered UI surface - skip toolbar/dropdown events
   *
   * @param event - The event to check
   * @returns true if the event should be skipped, false if it should be forwarded
   */
  #shouldSkipSurface(event: Event): boolean {
    if (this.#isEventOnActiveTarget(event)) {
      return true;
    }
    if (!this.#isInLayoutSurface(event)) {
      return true;
    }
    if (isInRegisteredSurface(event)) {
      return true;
    }
    return false;
  }

  /**
   * Checks if an event originated within a layout surface by walking the
   * event's composed path. Falls back to checking event.target directly
   * if composedPath is unavailable.
   *
   * @param event - The event to check
   * @returns true if event originated in a layout surface
   */
  #isInLayoutSurface(event: Event): boolean {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (path.length) {
      return path.some((node) => this.#layoutSurfaces.has(node as EventTarget));
    }
    const origin = event.target as EventTarget | null;
    return origin ? this.#layoutSurfaces.has(origin) : false;
  }

  /**
   * Returns the set of event targets to attach listeners to.
   * Includes registered layout surfaces and optionally the window for fallback.
   *
   * @returns Set of EventTargets for listener attachment
   */
  #getListenerTargets(): EventTarget[] {
    const targets = new Set<EventTarget>(this.#layoutSurfaces);
    if (this.#useWindowFallback) {
      targets.add(this.#windowRoot);
    }
    return Array.from(targets);
  }

  /**
   * Determines if a keyboard event represents a plain character key without
   * modifiers. Plain character keys are filtered out because they should be
   * handled by the beforeinput event instead to avoid double-handling.
   *
   * Note: Shift is intentionally not considered a modifier here since
   * Shift+character produces a different character (e.g., uppercase) that
   * should still go through beforeinput.
   *
   * @param event - The keyboard event to check
   * @returns true if event is a single character without Ctrl/Meta/Alt modifiers
   */
  #isPlainCharacterKey(event: KeyboardEvent): boolean {
    return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
  }
}
