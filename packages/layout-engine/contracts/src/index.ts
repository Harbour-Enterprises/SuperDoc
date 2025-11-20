/**
 * SuperDoc layout contracts (v0.5.0).
 * Shared between the PM adapter, measurers, layout engine, and painters.
 *
 * Design Philosophy:
 * - Contracts define the minimal interface for v0.1.0 paragraph-flow pagination
 * - Extension points (Fragment union, Run attrs) are intentionally left open
 * - Each package owns its own implementation details; contracts only define boundaries
 *
 * Version Strategy:
 * - Breaking changes to contract types will bump the version
 * - Packages can check CONTRACTS_VERSION at runtime for compatibility
 *
 * Future Work (out of scope for v0.1.0):
 * - RTL/bidirectional text support (will require CSS direction hints)
 * - Additional fragment types (images, tables, code blocks)
 * - Inline elements with layout implications (inline embeds)
 */

import type { TabStop } from './engines/tabs.js';

// Re-export TabStop for external consumers
export type { TabStop };

/**
 * Inline field annotation metadata extracted from w:sdt nodes.
 * Mirrors attrs defined in `packages/super-editor/src/extensions/field-annotation/field-annotation.js`.
 *
 * Note: `fieldId` defaults to an empty string if missing from the source attrs.
 * This ensures the field always has a stable identifier even when SDT data is incomplete.
 */
export type FieldAnnotationMetadata = {
  type: 'fieldAnnotation';
  variant?: 'text' | 'image' | 'signature' | 'checkbox' | 'html' | 'link';
  fieldId: string;
  fieldType?: string;
  displayLabel?: string;
  defaultDisplayLabel?: string;
  alias?: string;
  fieldColor?: string;
  borderColor?: string;
  highlighted?: boolean;
  fontFamily?: string | null;
  fontSize?: string | number | null;
  textColor?: string | null;
  textHighlight?: string | null;
  linkUrl?: string | null;
  imageSrc?: string | null;
  rawHtml?: unknown;
  size?: {
    width?: number;
    height?: number;
  } | null;
  extras?: Record<string, unknown> | null;
  multipleImage?: boolean;
  hash?: string | null;
  generatorIndex?: number | null;
  sdtId?: string | null;
  hidden?: boolean;
  visibility?: 'visible' | 'hidden';
  isLocked?: boolean;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
  marks?: Record<string, unknown>;
};

export type StructuredContentMetadata = {
  type: 'structuredContent';
  scope: 'inline' | 'block';
  id?: string | null;
  tag?: string | null;
  alias?: string | null;
  sdtPr?: unknown;
};

export type DocumentSectionMetadata = {
  type: 'documentSection';
  id?: string | null;
  title?: string | null;
  description?: string | null;
  sectionType?: string | null;
  isLocked?: boolean;
  sdBlockId?: string | null;
};

export type DocPartMetadata = {
  type: 'docPartObject';
  gallery?: string | null;
  uniqueId?: string | null;
  alias?: string | null;
  instruction?: string | null;
};

/**
 * Union of all SDT (Structured Document Tag) metadata variants.
 *
 * Word SDTs are flexible containers that can represent:
 * - **Field annotations**: inline placeholders for user input (client name, dates, etc.)
 * - **Structured content**: containers with semantic tags (inline or block-level)
 * - **Document sections**: locked or conditional regions with titles
 * - **Doc parts**: special objects like tables of contents
 *
 * The layout engine preserves this metadata through the conversion pipeline so
 * painters can render appropriate placeholders, locks, and visual hints.
 *
 * @example
 * // Field annotation on a text run
 * const fieldRun: TextRun = {
 *   text: 'Client Name',
 *   fontFamily: 'Arial',
 *   fontSize: 12,
 *   sdt: {
 *     type: 'fieldAnnotation',
 *     variant: 'text',
 *     fieldId: 'CLIENT_NAME',
 *     displayLabel: 'Client Name',
 *     fieldColor: '#980043',
 *     visibility: 'visible',
 *   }
 * };
 *
 * @example
 * // Inline structured content wrapping a run
 * const inlineScRun: TextRun = {
 *   text: 'ACME Corp',
 *   fontFamily: 'Calibri',
 *   fontSize: 11,
 *   sdt: {
 *     type: 'structuredContent',
 *     scope: 'inline',
 *     id: 'client-data-1',
 *     tag: 'client_name',
 *     alias: 'Client Data',
 *   }
 * };
 *
 * @example
 * // Block-level structured content on paragraph attrs
 * const blockScParagraph: ParagraphAttrs = {
 *   sdt: {
 *     type: 'structuredContent',
 *     scope: 'block',
 *     id: 'terms-block',
 *     tag: 'contract_terms',
 *     alias: 'Contract Terms Section',
 *   }
 * };
 *
 * @example
 * // Document section with lock
 * const lockedSection: ParagraphAttrs = {
 *   sdt: {
 *     type: 'documentSection',
 *     id: 'confidential-section',
 *     title: 'Confidential Clause',
 *     description: 'Not editable by signers',
 *     sectionType: 'locked',
 *     isLocked: true,
 *   }
 * };
 *
 * @example
 * // Table of contents
 * const tocBlock: ParagraphAttrs = {
 *   isTocEntry: true,
 *   sdt: {
 *     type: 'docPartObject',
 *     gallery: 'Table of Contents',
 *     instruction: 'TOC \\o "1-3" \\h \\z \\u',
 *   }
 * };
 */
export type SdtMetadata =
  | FieldAnnotationMetadata
  | StructuredContentMetadata
  | DocumentSectionMetadata
  | DocPartMetadata;

/**
 * `CONTRACTS_VERSION` is pinned per release so all consumers can assert compatibility.
 * Bump when breaking changes land.
 *
 * v1.0.0-alpha.1: Added engine contracts (paragraph, tabs, lists, image-wrap, tables)
 * v1.0.0-alpha.2: Merged keyboard input branch - added pmStart/pmEnd/token to TextRun
 * v1.0.0-alpha.3: Added pageReference token, pageRefMetadata, and TOC metadata (isTocEntry, tocInstruction)
 * v1.0.0-alpha.4: Added tracked-change metadata + mode wiring for layout-engine integration, and containerSdt field for dual metadata preservation
 * v1.0.0-alpha.5: Versioned FlowRunLink schema with extended metadata (target, rel, anchor, docLocation, etc.)
 */
export const CONTRACTS_VERSION = '1.0.0-alpha.5';

/**
 * Unique identifier for a block in the document.
 *
 * Current implementation: opaque string
 * Planned evolution: encode ProseMirror positions as `${pos}-${type}`
 * to support efficient diffing when document changes.
 */
/**
 * Stable identifier emitted by the PM adapter. Current format `${pos}-${type}` so we
 * can diff against ProseMirror node positions later.
 */
export type BlockId = string;

/**
 * A styled text run within a block.
 *
 * Represents a contiguous sequence of text with consistent styling.
 * Multiple runs compose a line or block.
 *
 * Extensibility:
 * - Purely stylistic properties (bold, italic, color) live here
 * - Semantic metadata (links, annotations, inline code) can be added via
 *   custom properties without affecting layout calculations
 * - If inline elements gain layout implications (e.g., inline embeds),
 *   we'll extend this type or add per-character metadata
 */
/**
 * `Run` carries inline styling and lightweight semantic hints. Extend via optional
 * props (e.g., underline, link metadata) as needed; avoid nested objects.
 */
export type LeaderType = 'dot' | 'heavy' | 'hyphen' | 'middleDot' | 'underscore';

// TabStop is imported from './engines/tabs.js' below

export type TrackedChangeKind = 'insert' | 'delete' | 'format';

export type TrackedChangesMode = 'review' | 'original' | 'final' | 'off';

/**
 * Minimal representation of a formatting mark captured by track-format metadata.
 * Mirrors ProseMirror marks ({ type, attrs }) but keeps attrs loosely typed since
 * different extensions attach different payloads.
 */
export type RunMark = {
  type: string;
  attrs?: Record<string, unknown> | null;
};

export type TrackedChangeMeta = {
  kind: TrackedChangeKind;
  id: string;
  author?: string;
  authorEmail?: string;
  authorImage?: string;
  date?: string;
  before?: RunMark[];
  after?: RunMark[];
};

export type FlowRunLinkTarget = '_blank' | '_self' | '_parent' | '_top';

export type FlowRunLink = {
  version?: 1 | 2;
  href?: string;
  title?: string;
  target?: FlowRunLinkTarget;
  rel?: string;
  tooltip?: string;
  anchor?: string;
  docLocation?: string;
  rId?: string;
  name?: string;
  history?: boolean;
};

export type TextRun = {
  kind?: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  sdt?: SdtMetadata;
  bold?: boolean;
  italic?: boolean;
  letterSpacing?: number;
  color?: string;
  // Styling from fidelity branch
  underline?: {
    style?: 'single' | 'double' | 'dotted' | 'dashed' | 'wavy';
    color?: string;
  };
  strike?: boolean;
  highlight?: string;
  link?: FlowRunLink;
  // Critical fields from keyboard input branch
  /**
   * Token annotations allow painters to resolve dynamic content (e.g., page numbers) at render time.
   */
  token?: 'pageNumber' | 'totalPageCount' | 'pageReference';
  /**
   * Absolute ProseMirror position (doc-relative, inclusive) of the first character in this run.
   * Populated by the PM adapter so downstream consumers can map layout coordinates back to PM positions.
   */
  pmStart?: number;
  /**
   * Absolute ProseMirror position (doc-relative, exclusive) immediately after the last character in this run.
   */
  pmEnd?: number;
  /**
   * Metadata for page reference tokens. Only populated when token === 'pageReference'.
   * Used by the layout engine to resolve cross-references to actual page numbers.
   */
  pageRefMetadata?: {
    bookmarkId: string;
    instruction: string; // e.g., "PAGEREF _Toc123 \h"
  };
  /**
   * Optional tracked-change metadata propagated from ProseMirror marks.
   * Consumers can use this to render annotations, tooltips, or reviewer cues.
   */
  trackedChange?: TrackedChangeMeta;
};

export type TabRun = {
  kind: 'tab';
  text: '\t';
  /**
   * Optional width assigned by the measurer/resolver. When undefined the consumer should call the shared resolver.
   */
  width?: number;
  tabStops?: TabStop[];
  tabIndex?: number;
  leader?: LeaderType | null;
  decimalChar?: string;
  indent?: ParagraphIndent;
  pmStart?: number;
  pmEnd?: number;
};

export type Run = TextRun | TabRun;

/**
 * A logical block in the document flow (typically a paragraph).
 *
 * PM Adapter Contract:
 * - The PM adapter outputs an array of FlowBlock[] from the ProseMirror document
 * - Optional document-level metadata (title, creator, etc.) can be returned
 *   alongside the blocks, but is not embedded in FlowBlock itself
 * - Block-level attributes (alignment, indentation) can be stored in `attrs`
 *
 * Processing Pipeline:
 * 1. PM Adapter extracts FlowBlock[] from ProseMirror
 * 2. Measurer calculates line breaks → Measure
 * 3. Layout Engine places lines on pages → Layout
 * 4. Painters render Layout to DOM/PDF
 */
export type ParagraphBlock = {
  kind: 'paragraph';
  id: BlockId;
  runs: Run[];
  attrs?: ParagraphAttrs;
};

// --------------------------
// Tables (Phase 1 minimal)
// --------------------------

/**
 * Border style enumeration (subset of OOXML ST_Border for rendering).
 * Maps OOXML border styles to renderable formats.
 *
 * Common styles:
 * - 'none': No border
 * - 'single': Standard solid line
 * - 'double': Two parallel lines
 * - 'dashed': Dashed line
 * - 'dotted': Dotted line
 * - 'thick': Thick solid line
 *
 * Additional styles can be added as needed for higher fidelity.
 */
export type BorderStyle =
  | 'none'
  | 'single'
  | 'double'
  | 'dashed'
  | 'dotted'
  | 'thick'
  | 'triple'
  | 'dotDash'
  | 'dotDotDash'
  | 'wave'
  | 'doubleWave';

/**
 * Border specification for table and cell borders.
 * Converted from OOXML border properties.
 */
export type BorderSpec = {
  /** Border style (maps to CSS border-style) */
  style?: BorderStyle;
  /** Border width in pixels (converted from eighths of a point) */
  width?: number;
  /** Border color (hex format with #) */
  color?: string;
  /** Space between border and content in pixels */
  space?: number;
};

/**
 * Three-state border value for table borders.
 *
 * This type represents the semantic meaning of border specifications in OOXML:
 * - `null`: No explicit border → inherit from table style or use default
 * - `{ none: true }`: Explicit "no border" → overrides any style borders
 * - `BorderSpec`: Explicit border → use specified width/color/style
 *
 * The three-state model prevents ambiguity where empty objects were previously
 * used for both "no border" and "inherit", causing fallback logic to fail.
 *
 * @example
 * // Inherit from style (may show border if style has one)
 * const borderValue: TableBorderValue = null;
 *
 * @example
 * // Explicitly no border (overrides style even if style has borders)
 * const borderValue: TableBorderValue = { none: true };
 *
 * @example
 * // Explicit border specification
 * const borderValue: TableBorderValue = {
 *   width: 1,
 *   style: 'single',
 *   color: '#000000'
 * };
 */
export type TableBorderValue = null | { none: true } | BorderSpec;

/**
 * Table-level border configuration.
 * Supports both outer borders and inner borders (between cells).
 */
export type TableBorders = {
  /** Top border of the table */
  top?: TableBorderValue;
  /** Right border of the table */
  right?: TableBorderValue;
  /** Bottom border of the table */
  bottom?: TableBorderValue;
  /** Left border of the table */
  left?: TableBorderValue;
  /** Inside horizontal borders (between rows) */
  insideH?: TableBorderValue;
  /** Inside vertical borders (between columns) */
  insideV?: TableBorderValue;
};

/**
 * Cell-level border configuration.
 * When specified, overrides table-level borders for this cell.
 */
export type CellBorders = {
  /** Top border of the cell */
  top?: BorderSpec;
  /** Right border of the cell */
  right?: BorderSpec;
  /** Bottom border of the cell */
  bottom?: BorderSpec;
  /** Left border of the cell */
  left?: BorderSpec;
};

/**
 * Table cell attributes.
 */
export type TableCellAttrs = {
  /** Cell-specific borders (override table borders) */
  borders?: CellBorders;
  /** Cell padding/margins */
  padding?: BoxSpacing;
  /** Vertical alignment of cell content */
  verticalAlign?: 'top' | 'middle' | 'bottom';
  /** Cell background color (hex format with #) */
  background?: string;
  /** Raw XML table cell properties for downstream rendering/features */
  tableCellProperties?: Record<string, unknown>;
};

/**
 * Table-level attributes.
 */
export type TableAttrs = {
  /** Table-level borders */
  borders?: TableBorders;
  /** Border collapse mode (CSS border-collapse property) */
  borderCollapse?: 'collapse' | 'separate';
  /** Cell spacing in pixels (only applies when borderCollapse is 'separate') */
  cellSpacing?: number;
  /**
   * Structured Document Tag metadata when this table originated from a w:sdt.
   */
  sdt?: SdtMetadata;
  /**
   * Container SDT metadata for tables inside documentSections or other container SDTs.
   * See ParagraphAttrs.containerSdt for full documentation and usage patterns.
   */
  containerSdt?: SdtMetadata;
  /** Additional arbitrary attributes */
  [key: string]: unknown;
};

export type TableCell = {
  id: BlockId;
  // For now, single paragraph per cell; future: allow multiple paragraphs
  paragraph: ParagraphBlock;
  rowSpan?: number;
  colSpan?: number;
  /** Cell-specific attributes */
  attrs?: TableCellAttrs;
};

export type TableRowAttrs = {
  /** Raw XML table row properties */
  tableRowProperties?: Record<string, unknown>;
};

export type TableRow = {
  id: BlockId;
  cells: TableCell[];
  /** Row-specific metadata derived from OOXML */
  attrs?: TableRowAttrs;
};

export type TableBlock = {
  kind: 'table';
  id: BlockId;
  rows: TableRow[];
  /** Table-level attributes including borders */
  attrs?: TableAttrs;
  /**
   * Column widths in pixels, extracted from OOXML w:tblGrid.
   * When provided, the measurer will use these widths instead of equal distribution.
   * Array length should match the number of columns in the table.
   */
  columnWidths?: number[];
};

export type BoxSpacing = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type PageMargins = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  header?: number;
  footer?: number;
  gutter?: number;
};

/**
 * Image block attributes including SDT metadata.
 */
export type ImageBlockAttrs = {
  /**
   * Structured Document Tag metadata when this image originated from a w:sdt.
   */
  sdt?: SdtMetadata;
  /**
   * Container SDT metadata for images inside documentSections or other container SDTs.
   * See ParagraphAttrs.containerSdt for full documentation and usage patterns.
   */
  containerSdt?: SdtMetadata;
  /** Additional arbitrary attributes */
  [key: string]: unknown;
};

export type ImageBlock = {
  kind: 'image';
  id: BlockId;
  src: string;
  width?: number;
  height?: number;
  alt?: string;
  title?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  display?: 'inline' | 'block';
  padding?: BoxSpacing;
  margin?: BoxSpacing;
  anchor?: ImageAnchor;
  wrap?: ImageWrap;
  attrs?: ImageBlockAttrs;
};

export type DrawingKind = 'image' | 'vectorShape' | 'shapeGroup';

export type DrawingContentSnapshot = {
  name: string;
  attributes?: Record<string, unknown>;
  elements?: unknown[];
};

export type DrawingGeometry = {
  width: number;
  height: number;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
};

export type PositionedDrawingGeometry = DrawingGeometry & {
  x?: number;
  y?: number;
};

export type VectorShapeStyle = {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
};

export type ShapeGroupTransform = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  childX?: number;
  childY?: number;
  childWidth?: number;
  childHeight?: number;
  childOriginXEmu?: number;
  childOriginYEmu?: number;
};

export type ShapeGroupVectorChild = {
  shapeType: 'vectorShape';
  attrs: PositionedDrawingGeometry &
    VectorShapeStyle & {
      kind?: string;
      shapeId?: string;
      shapeName?: string;
    };
};

export type ShapeGroupImageChild = {
  shapeType: 'image';
  attrs: PositionedDrawingGeometry & {
    src: string;
    alt?: string;
  };
};

export type ShapeGroupUnknownChild = {
  shapeType: string;
  attrs: Record<string, unknown>;
};

export type ShapeGroupChild = ShapeGroupVectorChild | ShapeGroupImageChild | ShapeGroupUnknownChild;

export type DrawingBlockBase = {
  kind: 'drawing';
  id: BlockId;
  drawingKind: DrawingKind;
  margin?: BoxSpacing;
  padding?: BoxSpacing;
  anchor?: ImageAnchor;
  wrap?: ImageWrap;
  zIndex?: number;
  drawingContentId?: string;
  drawingContent?: DrawingContentSnapshot;
  attrs?: Record<string, unknown>;
};

export type VectorShapeDrawing = DrawingBlockBase & {
  drawingKind: 'vectorShape';
  geometry: DrawingGeometry;
  shapeKind?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
};

export type ShapeGroupDrawing = DrawingBlockBase & {
  drawingKind: 'shapeGroup';
  geometry: DrawingGeometry;
  groupTransform?: ShapeGroupTransform;
  shapes: ShapeGroupChild[];
  size?: {
    width?: number;
    height?: number;
  };
};

export type ImageDrawing = DrawingBlockBase &
  Omit<ImageBlock, 'kind' | 'id' | 'margin' | 'padding' | 'anchor' | 'wrap'> & {
    drawingKind: 'image';
  };

export type DrawingBlock = VectorShapeDrawing | ShapeGroupDrawing | ImageDrawing;

export type SectionBreakBlock = {
  kind: 'sectionBreak';
  id: BlockId;
  /**
   * Section break type determines how the section starts.
   * Note: For Phase 1, all types apply changes at the next page boundary (page-level semantics).
   * True continuous (mid-page region changes) is deferred to a future phase.
   *
   * - 'continuous': Apply properties from next page (page-level, not mid-page region)
   * - 'nextPage': Force a page break and apply properties (default Word behavior)
   * - 'evenPage': Force break to next even page number (insert blank if needed)
   * - 'oddPage': Force break to next odd page number (insert blank if needed)
   *
   * Default if unspecified: 'continuous' (matches Word default)
   */
  type?: 'continuous' | 'nextPage' | 'evenPage' | 'oddPage';
  /**
   * Section-specific page size in pixels.
   * When specified, overrides the document default page size starting from the next page.
   * Typically used in conjunction with orientation changes.
   */
  pageSize?: {
    w: number;
    h: number;
  };
  /**
   * Page orientation for this section.
   * - 'portrait': Height > Width (standard)
   * - 'landscape': Width > Height (rotated 90 degrees)
   *
   * When orientation changes, pageSize dimensions should already be swapped appropriately.
   */
  orientation?: 'portrait' | 'landscape';
  /**
   * Section-specific margins in pixels.
   * - header/footer are distances from the page edge.
   * - top/bottom reserved for future (explicit top/bottom overrides).
   */
  margins: {
    header?: number;
    footer?: number;
    top?: number;
    bottom?: number;
  };
  /**
   * Optional page numbering configuration that starts at the next page after
   * this break. Mirrors OOXML <w:pgNumType> semantics.
   */
  numbering?: {
    format?: 'decimal' | 'lowerLetter' | 'upperLetter' | 'lowerRoman' | 'upperRoman';
    start?: number;
  };
  /**
   * Per-section header references (rIds) for each header type.
   * These are the relationship IDs that map to specific header parts in the document.
   * Undefined types inherit from previous section or fall back to document defaults.
   */
  headerRefs?: {
    default?: string;
    first?: string;
    even?: string;
    odd?: string;
  };
  /**
   * Per-section footer references (rIds) for each footer type.
   * These are the relationship IDs that map to specific footer parts in the document.
   * Undefined types inherit from previous section or fall back to document defaults.
   */
  footerRefs?: {
    default?: string;
    first?: string;
    even?: string;
    odd?: string;
  };
  /**
   * Column configuration for this section.
   * - count: Number of columns (1 = single column, default)
   * - gap: Space between columns in pixels
   * - equalWidth: Reserved for future support of unequal column widths
   *
   * When specified, applies from the next page boundary (page-level semantics).
   * Column changes follow the same active/pending pattern as margins and page size.
   */
  columns?: {
    count: number;
    gap: number;
    equalWidth?: boolean;
  };
  attrs?: {
    source?: string;
    /**
     * When true, forces a page boundary even for 'continuous' section breaks.
     * Used to maintain Word compatibility when header/footer semantics or titlePg
     * require a new page to take effect properly.
     */
    requirePageBoundary?: boolean;
    [key: string]: unknown;
  };
};

export type SectionRefType = 'default' | 'first' | 'even' | 'odd';

export type SectionRefs = {
  headerRefs?: Partial<Record<SectionRefType, string>>;
  footerRefs?: Partial<Record<SectionRefType, string>>;
};

export type SectionNumbering = {
  format?: 'decimal' | 'lowerLetter' | 'upperLetter' | 'lowerRoman' | 'upperRoman';
  start?: number;
};

export type SectionMetadata = {
  sectionIndex: number;
  headerRefs?: Partial<Record<SectionRefType, string>>;
  footerRefs?: Partial<Record<SectionRefType, string>>;
  numbering?: SectionNumbering;
};

/**
 * Explicit page break block.
 *
 * Forces content to start on the next page.
 * - Flushes current page and starts a new one
 * - Commonly created from <w:br w:type="page"/> in DOCX
 * - ProseMirror node type: 'hardBreak'
 */
export type PageBreakBlock = {
  kind: 'pageBreak';
  id: BlockId;
  attrs?: Record<string, unknown>;
};

/**
 * Explicit column break block.
 *
 * Represents a mid-column break that forces content to continue
 * in the next column on the same page (or next page if in last column).
 *
 * Corresponds to OOXML: <w:br w:type="column"/>
 * ProseMirror node type: 'lineBreak' with attrs.lineBreakType === 'column'
 *
 * Phase 4 Implementation:
 * - Forces break to next column at current position
 * - Does NOT create new page unless already in last column and column is full
 * - Preserves paragraph continuity (same paragraph continues in next column)
 */
export type ColumnBreakBlock = {
  kind: 'columnBreak';
  id: BlockId;
  attrs?: Record<string, unknown>;
};

/**
 * Describes how an anchored image is positioned relative to its reference.
 * Offsets are expressed in CSS px relative to the page/column content box.
 */
export type ImageAnchor = {
  isAnchored?: boolean;
  hRelativeFrom?: 'column' | 'page' | 'margin';
  vRelativeFrom?: 'paragraph' | 'page' | 'margin';
  alignH?: 'left' | 'center' | 'right';
  alignV?: 'top' | 'center' | 'bottom';
  offsetH?: number;
  offsetV?: number;
  behindDoc?: boolean;
};

/**
 * Text wrapping metadata for floating images. Distances are in px.
 * Polygon coordinates are normalized to the image's native coordinate space.
 */
export type ImageWrap = {
  type: 'None' | 'Square' | 'Tight' | 'Through' | 'TopAndBottom' | 'Inline';
  wrapText?: 'bothSides' | 'left' | 'right' | 'largest';
  distTop?: number;
  distBottom?: number;
  distLeft?: number;
  distRight?: number;
  polygon?: number[][];
  behindDoc?: boolean;
};

/**
 * Exclusion zone created by an anchored image with text wrapping.
 * Used by the layout engine to compute reduced line widths for paragraphs.
 */
export type ExclusionZone = {
  imageBlockId: BlockId;
  pageNumber: number;
  columnIndex: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  distances: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  wrapMode: 'left' | 'right' | 'both' | 'none' | 'largest';
  polygon?: number[][];
};

export type ParagraphSpacing = {
  before?: number;
  after?: number;
  line?: number;
  lineRule?: 'auto' | 'exact' | 'atLeast';
};

export type ParagraphIndent = {
  left?: number;
  right?: number;
  firstLine?: number;
  hanging?: number;
};

export type ParagraphBorder = {
  style?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  width?: number;
  color?: string;
  space?: number;
};

export type ParagraphBorders = {
  top?: ParagraphBorder;
  right?: ParagraphBorder;
  bottom?: ParagraphBorder;
  left?: ParagraphBorder;
};

export type ParagraphShading = {
  fill?: string;
  color?: string;
  val?: string;
  themeColor?: string;
  themeFill?: string;
  themeFillShade?: string;
  themeFillTint?: string;
  themeShade?: string;
  themeTint?: string;
};

/**
 * Paragraph-level attributes from OOXML.
 *
 * Tab stops use OOXML-aligned format:
 * - Positions stored in twips (1/1440 inch) to preserve exact values
 * - Alignment uses 'start'/'end' (OOXML native, handles RTL properly)
 * - Conversion to pixels happens at measurement boundary only
 */
export type ParagraphAttrs = {
  alignment?: 'left' | 'center' | 'right' | 'justify';
  spacing?: ParagraphSpacing;
  indent?: ParagraphIndent;
  numberingProperties?: Record<string, unknown>;
  borders?: ParagraphBorders;
  shading?: ParagraphShading;
  tabs?: TabStop[]; // OOXML format: positions in twips, val: start/end/center/decimal/bar/clear
  decimalSeparator?: string; // Default: '.' (locale-dependent in OOXML)
  tabIntervalTwips?: number; // Default: 720 (0.5") if not provided
  /**
   * Track-changes metadata applied during adapter conversion.
   * Used so layout/measuring caches can differentiate between review modes.
   */
  trackedChangesMode?: TrackedChangesMode;
  trackedChangesEnabled?: boolean;
  /**
   * Text direction metadata for RTL/LTR paragraphs.
   * `direction` mirrors CSS direction; `rtl` is a boolean convenience flag.
   */
  direction?: 'ltr' | 'rtl';
  rtl?: boolean;
  /**
   * Indicates this paragraph is part of a Table of Contents.
   * Set by the PM adapter when unwrapping tableOfContents blocks.
   */
  isTocEntry?: boolean;
  /**
   * The original TOC field instruction (e.g., "TOC \o '1-3'").
   * Preserved for future TOC regeneration features.
   */
  tocInstruction?: string;
  /**
   * Floating alignment for positioned paragraphs (from OOXML w:framePr/@w:xAlign).
   *
   * When set, the paragraph acts as a positioned frame:
   * - The entire paragraph is horizontally repositioned after layout
   * - 'right': right edge aligns with column/margin boundary
   * - 'center': paragraph is centered horizontally
   * - 'left': left edge aligns with column/margin boundary (though this is default behavior)
   *
   * Common use case: Right-aligned page numbers in headers/footers.
   *
   * Note: This is different from `alignment` which controls text justification within
   * the paragraph. `floatAlignment` controls where the paragraph block itself is positioned.
   */
  floatAlignment?: 'left' | 'right' | 'center';
  /**
   * Word paragraph layout output from @superdoc/word-layout.
   * Computed by the PM adapter for paragraphs with numbering properties.
   * Contains marker layout data, resolved indents, and tab stops.
   *
   * Type is `unknown` to avoid dependency on @superdoc/word-layout.
   * Consumers should cast to `WordParagraphLayoutOutput` from that package.
   */
  wordLayout?: unknown;
  /**
   * Structured Document Tag metadata (field annotations, structured content, document sections).
   * Populated when this block originated from a w:sdt.
   */
  sdt?: SdtMetadata;
  /**
   * Container SDT metadata for blocks that have BOTH primary and container metadata.
   *
   * Use case: TOC paragraphs inside documentSections need to preserve:
   * - `sdt`: docPartObject metadata (for TOC functionality: gallery, instruction, uniqueId)
   * - `containerSdt`: documentSection metadata (for painter styling: isLocked, title, sectionType)
   *
   * Painters should render both:
   * - Primary metadata as `data-sdt-*` attributes
   * - Container metadata as `data-sdt-container-*` attributes
   *
   * @example
   * // TOC paragraph inside locked section
   * const tocInSection: ParagraphAttrs = {
   *   isTocEntry: true,
   *   sdt: {
   *     type: 'docPartObject',
   *     gallery: 'Table of Contents',
   *     uniqueId: 'toc-1',
   *     instruction: 'TOC \\o "1-3"',
   *   },
   *   containerSdt: {
   *     type: 'documentSection',
   *     id: 'locked-section',
   *     title: 'Confidential Section',
   *     sectionType: 'locked',
   *     isLocked: true,
   *   }
   * };
   */
  containerSdt?: SdtMetadata;
};

export type ListMarker = {
  kind: 'bullet' | 'number';
  text: string;
  level: number;
  order?: number;
  style?: string;
  numId?: string;
  levels?: number[];
  numberingType?: string;
  lvlText?: string;
  customFormat?: string;
  align?: 'left' | 'center' | 'right';
};

export type ListItem = {
  id: BlockId;
  marker: ListMarker;
  paragraph: ParagraphBlock;
};

export type ListBlock = {
  kind: 'list';
  id: BlockId;
  listType: 'bullet' | 'number';
  items: ListItem[];
};

export type FlowBlock =
  | ParagraphBlock
  | ImageBlock
  | DrawingBlock
  | ListBlock
  | TableBlock
  | SectionBreakBlock
  | PageBreakBlock
  | ColumnBreakBlock;

export type ColumnLayout = {
  count: number;
  gap: number;
};

/**
 * A measured line within a block, output by the measurer.
 *
 * Positioning:
 * - `fromRun`/`fromChar`: start position within the block's runs array
 * - `toRun`/`toChar`: end position (exclusive)
 * - Indices allow the painter to slice runs and render the exact text
 *
 * Metrics:
 * - `width`: total width of the line (used for layout placement)
 * - `ascent`/`descent`: typography metrics for vertical positioning
 * - `lineHeight`: total vertical space occupied by the line
 *
 * The measurer is responsible for line breaking (width constraints, hyphenation)
 * and calculating these metrics based on font rendering.
 */
export type Line = {
  fromRun: number;
  fromChar: number;
  toRun: number;
  toChar: number;
  width: number;
  ascent: number;
  descent: number;
  lineHeight: number;
  segments?: LineSegment[];
  // Optional decorations produced by measurer for tab leaders and bar tabs
  leaders?: LeaderDecoration[];
  bars?: BarDecoration[];
};

export type LineSegment = {
  runIndex: number;
  fromChar: number;
  toChar: number;
  width: number;
  x?: number; // Horizontal offset in pixels (for absolute positioning)
};

export type LeaderDecoration = {
  from: number; // px
  to: number; // px
  style: 'dot' | 'hyphen' | 'underscore' | 'heavy';
};

export type BarDecoration = {
  x: number; // px
};

/**
 * The result of measuring a block, produced by the measurer.
 *
 * Contains all lines produced by line-breaking the block's runs,
 * plus the total height for quick layout calculations.
 */
export type ParagraphMeasure = {
  kind: 'paragraph';
  lines: Line[];
  totalHeight: number;
  marker?: {
    markerWidth: number;
    markerTextWidth: number;
    indentLeft: number;
  };
};

export type ImageMeasure = {
  kind: 'image';
  width: number;
  height: number;
};

export type DrawingMeasure = {
  kind: 'drawing';
  drawingKind: DrawingKind;
  width: number;
  height: number;
  scale: number;
  /**
   * Axis-aligned bounding box before column/page constraints are applied.
   */
  naturalWidth: number;
  naturalHeight: number;
  geometry: DrawingGeometry;
  groupTransform?: ShapeGroupTransform;
};

export type TableCellMeasure = {
  paragraph: ParagraphMeasure;
  width: number;
  height: number;
};

export type TableRowMeasure = {
  cells: TableCellMeasure[];
  height: number;
};

export type TableMeasure = {
  kind: 'table';
  rows: TableRowMeasure[];
  columnWidths: number[];
  totalWidth: number;
  totalHeight: number;
};

/**
 * Section break measure.
 *
 * Pass-through measure for section breaks (no dimensions needed).
 */
export type SectionBreakMeasure = {
  kind: 'sectionBreak';
};

/**
 * Page break measure.
 *
 * Pass-through measure for page breaks (no dimensions needed).
 * Page breaks force layout to start on a new page.
 */
export type PageBreakMeasure = {
  kind: 'pageBreak';
};

/**
 * Column break measure.
 *
 * Pass-through measure for column breaks (no dimensions needed).
 * Column breaks force layout to advance to the next column.
 */
export type ColumnBreakMeasure = {
  kind: 'columnBreak';
};

export type ListItemMeasure = {
  itemId: BlockId;
  markerWidth: number;
  markerTextWidth: number;
  indentLeft: number;
  paragraph: ParagraphMeasure;
};

export type ListMeasure = {
  kind: 'list';
  items: ListItemMeasure[];
  totalHeight: number;
};

export type Measure =
  | ParagraphMeasure
  | ImageMeasure
  | DrawingMeasure
  | TableMeasure
  | ListMeasure
  | SectionBreakMeasure
  | PageBreakMeasure
  | ColumnBreakMeasure;

/**
 * A rendered page in the final layout.
 *
 * Contains positioned fragments ready for painting.
 * Page numbers are 1-indexed for user-facing display.
 */
export type Page = {
  number: number;
  fragments: Fragment[];
  margins?: PageMargins;
  /**
   * Optional display string for the page number.
   * When present, painters should render PAGE fields using this value
   * instead of the raw ordinal `number` (supports roman/letter formats
   * and section restarts).
   */
  numberText?: string;
  /**
   * Per-page size override in pixels.
   * When present, painters should use this instead of the global layout.pageSize.
   * Used for pages with different orientations or explicit size changes.
   */
  size?: {
    w: number;
    h: number;
  };
  /**
   * Page orientation.
   * Derived from the active section's orientation property.
   * Used by painters to determine page rendering direction.
   */
  orientation?: 'portrait' | 'landscape';
  /**
   * Per-section header and footer references for this page.
   * Allows painters to select the correct header/footer variant based on
   * which section this page belongs to. Undefined types inherit from previous
   * section or fall back to document defaults.
   */
  sectionRefs?: {
    headerRefs?: {
      default?: string;
      first?: string;
      even?: string;
      odd?: string;
    };
    footerRefs?: {
      default?: string;
      first?: string;
      even?: string;
      odd?: string;
    };
  };
};

/**
 * A paragraph fragment positioned on a page.
 *
 * Represents a portion of a block (potentially spanning multiple lines)
 * that has been placed at a specific position on a page.
 *
 * Cross-page continuity:
 * - `continuesFromPrev`: true if this fragment continues a block from the previous page
 * - `continuesOnNext`: true if this fragment continues onto the next page
 * - These flags help painters render continuation indicators (e.g., no bottom margin)
 *
 * Line slicing:
 * - `fromLine`/`toLine`: indices into the block's Measure.lines array
 * - Allows the painter to render only the relevant subset of lines
 */
export type ParaFragment = {
  kind: 'para';
  blockId: BlockId;
  fromLine: number;
  toLine: number;
  x: number;
  y: number;
  width: number;
  continuesFromPrev?: boolean;
  continuesOnNext?: boolean;
  markerWidth?: number;
  /**
   * Absolute PM range covered by this fragment. Inclusive start, exclusive end.
   */
  pmStart?: number;
  pmEnd?: number;
};

/**
 * Column boundary metadata for table resize interaction.
 *
 * Provides geometry information for rendering resize handles and enforcing
 * minimum width constraints during interactive column resizing.
 */
export type TableColumnBoundary = {
  /** Column index (0-based) */
  index: number;
  /** Left edge position in pixels, fragment-relative */
  x: number;
  /** Column width in pixels */
  width: number;
  /** Minimum width in pixels (content-based, layout-computed) */
  minWidth: number;
  /** Whether this column can be resized */
  resizable: boolean;
};

/**
 * Row boundary metadata for table resize interaction.
 *
 * Optional - only populated for visible/rendered fragments to reduce DOM overhead.
 * Not needed for column resize operations.
 */
export type TableRowBoundary = {
  /** Row index relative to fromRow */
  index: number;
  /** Top edge position in pixels, fragment-relative */
  y: number;
  /** Row height in pixels */
  height: number;
};

/**
 * Table fragment metadata for interactive resizing.
 *
 * Exposes geometry data from layout engine to enable precise positioning
 * of resize handles without reverse-engineering DOM structure.
 */
export type TableFragmentMetadata = {
  /** Column boundary information (always included) */
  columnBoundaries: TableColumnBoundary[];
  /** Row boundary information (optional, for visible fragments only) */
  rowBoundaries?: TableRowBoundary[];
  /** Coordinate system origin (always 'fragment' for fragment-relative positions) */
  coordinateSystem: 'fragment';
};

export type TableFragment = {
  kind: 'table';
  blockId: BlockId;
  fromRow: number;
  toRow: number;
  x: number;
  y: number;
  width: number;
  height: number;
  continuesFromPrev?: boolean;
  continuesOnNext?: boolean;
  /** Optional metadata for interactive table resizing */
  metadata?: TableFragmentMetadata;
};

export type ImageFragment = {
  kind: 'image';
  blockId: BlockId;
  x: number;
  y: number;
  width: number;
  height: number;
  isAnchored?: boolean;
  zIndex?: number;
  pmStart?: number;
  pmEnd?: number;
};

export type DrawingFragment = {
  kind: 'drawing';
  blockId: BlockId;
  drawingKind: DrawingKind;
  x: number;
  y: number;
  width: number;
  height: number;
  isAnchored?: boolean;
  zIndex?: number;
  geometry: DrawingGeometry;
  scale: number;
  drawingContentId?: string;
  pmStart?: number;
  pmEnd?: number;
};

/**
 * Union of all fragment types supported by the layout engine.
 *
 * v0.1.0: Only ParaFragment is supported
 * Future: Will expand to include ImageFragment, TableFragment, CodeFragment, etc.
 */
export type ListItemFragment = {
  kind: 'list-item';
  blockId: BlockId;
  itemId: BlockId;
  fromLine: number;
  toLine: number;
  x: number;
  y: number;
  width: number;
  markerWidth: number;
  continuesFromPrev?: boolean;
  continuesOnNext?: boolean;
};

export type Fragment = ParaFragment | ImageFragment | DrawingFragment | ListItemFragment | TableFragment;

/**
 * Header/footer classification mirrors Word semantics.
 * - `default`: applies when no other variant is provided
 * - `first`: used when title-page headers/footers are enabled
 * - `even`/`odd`: used when alternate headers/footers are enabled
 */
export type HeaderFooterType = 'default' | 'first' | 'even' | 'odd';

/**
 * Single page worth of header/footer fragments.
 * Pages share layout coordinates with the body canvas (0,0 at top-left of the physical page).
 */
export type HeaderFooterPage = {
  number: number;
  fragments: Fragment[];
  /**
   * Optional display string mirroring the body page's formatted number.
   */
  numberText?: string;
};

/**
 * Layout output for a specific header/footer variant.
 *
 * `height` reflects the measured space that variant occupies so consumers can
 * reason about clipping/overflow relative to the margin allocation.
 *
 * `minY` and `maxY` provide the full bounding box for proper positioning,
 * especially important for anchored images with negative offsets.
 */
export type HeaderFooterLayout = {
  height: number;
  minY?: number;
  maxY?: number;
  pages: HeaderFooterPage[];
};

/**
 * The final layout output, ready for painting.
 *
 * Page Size:
 * - `pageSize` represents the physical canvas dimensions (e.g., 8.5" × 11")
 * - Margins are NOT encoded here; the layout engine accepts margins as an option
 *   and calculates the content area internally
 * - This keeps print presets (A4, Letter, etc.) out of the contract
 *
 * The layout engine is responsible for:
 * - Placing measured lines into pages respecting content area bounds
 * - Splitting blocks across pages when necessary (creating ParaFragments)
 * - Calculating final x/y positions for each fragment
 */
export type Layout = {
  pageSize: { w: number; h: number };
  pages: Page[];
  columns?: ColumnLayout;
  /**
   * Optional header/footer layout variants keyed by Word semantics. Consumers can
   * ignore this field if they only care about body pagination.
   */
  headerFooter?: Partial<Record<HeaderFooterType, HeaderFooterLayout>>;
};

/**
 * DOM painter interface.
 *
 * Renders a layout into a DOM container for preview/editing.
 * Responsible for:
 * - Creating page elements
 * - Positioning fragments within pages
 * - Applying text styling from runs
 * - Handling user interactions (selection, cursor positioning)
 */
export interface PainterDOM {
  paint(layout: Layout, mount: HTMLElement): void;
  /**
   * Optional hook for incremental pipelines to refresh the underlying block/measures
   * without reinstantiating the painter. Implementations that don't need this can ignore it.
   */
  setData?(blocks: FlowBlock[], measures: Measure[]): void;
}

/**
 * PDF painter interface.
 *
 * Renders a layout to a PDF blob for export/download.
 * Responsible for:
 * - Generating PDF pages with correct dimensions
 * - Embedding fonts and rendering text runs
 * - Applying styling (bold, italic, color, etc.)
 * - Producing a binary blob suitable for saving/printing
 */
export interface PainterPDF {
  render(layout: Layout): Promise<Blob>;
}

/**
 * Convenience helper to convert optional DOCX-style page margins into header/footer allocations (in the same units).
 * Consumers should multiply by their DPI (if needed) when converting inches to px.
 */
export const extractHeaderFooterSpace = (
  margins?: PageMargins | null,
): {
  headerSpace: number;
  footerSpace: number;
} => {
  return {
    headerSpace: margins?.header ?? 0,
    footerSpace: margins?.footer ?? 0,
  };
};

/**
 * Engine contracts (pure Word layout logic).
 * Re-exported from ./engines/ for convenience.
 */
export * as Engines from './engines/index.js';
