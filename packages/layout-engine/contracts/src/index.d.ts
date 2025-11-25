/**
 * SuperDoc layout contracts.
 * Shared between the PM adapter, measurers, layout engine, and painters.
 */
import type { TabStop } from './engines/tabs.js';
export type { TabStop };
/**
 * Contracts version for runtime compatibility checks.
 */
export declare const CONTRACTS_VERSION = '1.0.0';
/**
 * Unique identifier for a block in the document.
 */
export type BlockId = string;
export type LeaderType = 'dot' | 'heavy' | 'hyphen' | 'middleDot' | 'underscore';
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
  /**
   * Custom data attributes propagated from ProseMirror marks (keys must be data-*).
   */
  dataAttrs?: Record<string, string>;
  bold?: boolean;
  italic?: boolean;
  letterSpacing?: number;
  color?: string;
  underline?: {
    style?: 'single' | 'double' | 'dotted' | 'dashed' | 'wavy';
    color?: string;
  };
  strike?: boolean;
  highlight?: string;
  link?: FlowRunLink;
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
    instruction: string;
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
  /** Additional arbitrary attributes */
  [key: string]: unknown;
};
export type TableCell = {
  id: BlockId;
  paragraph: ParagraphBlock;
  rowSpan?: number;
  colSpan?: number;
  /** Cell-specific attributes */
  attrs?: TableCellAttrs;
};
export type TableRow = {
  id: BlockId;
  cells: TableCell[];
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
  attrs?: Record<string, unknown>;
};
export type SectionBreakBlock = {
  kind: 'sectionBreak';
  id: BlockId;
  /**
   * Section break type determines how the section starts.
   * - 'continuous': Apply properties from next page
   * - 'nextPage': Force a page break and apply properties
   * - 'evenPage': Force break to next even page number
   * - 'oddPage': Force break to next odd page number
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
   */
  margins: {
    header?: number;
    footer?: number;
    top?: number;
    bottom?: number;
  };
  /**
   * Column configuration for this section.
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
  borders?: ParagraphBorders;
  shading?: ParagraphShading;
  tabs?: TabStop[];
  decimalSeparator?: string;
  tabIntervalTwips?: number;
  /**
   * Track-changes metadata applied during adapter conversion.
   * Used so layout/measuring caches can differentiate between review modes.
   */
  trackedChangesMode?: TrackedChangesMode;
  trackedChangesEnabled?: boolean;
  direction?: 'ltr' | 'rtl';
  rtl?: boolean;
  /**
   * Indicates this paragraph is part of a Table of Contents.
   * Set by the PM adapter when unwrapping tableOfContents blocks.
   */
  isTocEntry?: boolean;
  /**
   * The original TOC field instruction (e.g., "TOC \o '1-3'").
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
  leaders?: LeaderDecoration[];
  bars?: BarDecoration[];
};
export type LineSegment = {
  runIndex: number;
  fromChar: number;
  toChar: number;
  width: number;
  x?: number;
};
export type LeaderDecoration = {
  from: number;
  to: number;
  style: 'dot' | 'hyphen' | 'underscore' | 'heavy';
};
export type BarDecoration = {
  x: number;
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
};
export type ImageMeasure = {
  kind: 'image';
  width: number;
  height: number;
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
  /**
   * Absolute PM range covered by this fragment. Inclusive start, exclusive end.
   */
  pmStart?: number;
  pmEnd?: number;
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
};
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
export type Fragment = ParaFragment | ImageFragment | ListItemFragment | TableFragment;
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
  pageSize: {
    w: number;
    h: number;
  };
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
export declare const extractHeaderFooterSpace: (margins?: PageMargins | null) => {
  headerSpace: number;
  footerSpace: number;
};
/**
 * Engine contracts (pure Word layout logic).
 * Re-exported from ./engines/ for convenience.
 */
export * as Engines from './engines/index.js';
