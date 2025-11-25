import type { TabStop } from './engines/tabs.js';

// Re-export TabStop for external consumers
export type { TabStop };

/** Inline field annotation metadata extracted from w:sdt nodes. */
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
 * - Field annotations: inline placeholders for user input
 * - Structured content: containers with semantic tags (inline or block-level)
 * - Document sections: locked or conditional regions with titles
 * - Doc parts: special objects like tables of contents
 */
export type SdtMetadata =
  | FieldAnnotationMetadata
  | StructuredContentMetadata
  | DocumentSectionMetadata
  | DocPartMetadata;

export const CONTRACTS_VERSION = '1.0.0';

/** Unique identifier for a block in the document. Format: `${pos}-${type}`. */
export type BlockId = string;

/** Tab leader type for filling space before tab stops. */
export type LeaderType = 'dot' | 'heavy' | 'hyphen' | 'middleDot' | 'underscore';

export type TrackedChangeKind = 'insert' | 'delete' | 'format';

export type TrackedChangesMode = 'review' | 'original' | 'final' | 'off';

/** Formatting mark for track-format metadata. */
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
  sdt?: SdtMetadata;
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
  /** Token annotations for dynamic content (page numbers, etc.). */
  token?: 'pageNumber' | 'totalPageCount' | 'pageReference';
  /** Absolute ProseMirror position (inclusive) of first character in this run. */
  pmStart?: number;
  /** Absolute ProseMirror position (exclusive) after the last character. */
  pmEnd?: number;
  /** Metadata for page reference tokens (only when token === 'pageReference'). */
  pageRefMetadata?: {
    bookmarkId: string;
    instruction: string;
  };
  /** Tracked-change metadata from ProseMirror marks. */
  trackedChange?: TrackedChangeMeta;
};

export type TabRun = {
  kind: 'tab';
  text: '\t';
  /** Width in pixels (assigned by measurer/resolver). */
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

export type ParagraphBlock = {
  kind: 'paragraph';
  id: BlockId;
  runs: Run[];
  attrs?: ParagraphAttrs;
};

/** Border style (subset of OOXML ST_Border). */
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

/** Border specification for table and cell borders. */
export type BorderSpec = {
  style?: BorderStyle;
  width?: number;
  color?: string;
  space?: number;
};

/**
 * Three-state border value for table borders.
 * - `null`: inherit from table style
 * - `{ none: true }`: explicit "no border"
 * - `BorderSpec`: explicit border
 */
export type TableBorderValue = null | { none: true } | BorderSpec;

/** Table-level border configuration (outer + inner borders). */
export type TableBorders = {
  top?: TableBorderValue;
  right?: TableBorderValue;
  bottom?: TableBorderValue;
  left?: TableBorderValue;
  insideH?: TableBorderValue;
  insideV?: TableBorderValue;
};

/** Cell-level border configuration (overrides table-level borders). */
export type CellBorders = {
  top?: BorderSpec;
  right?: BorderSpec;
  bottom?: BorderSpec;
  left?: BorderSpec;
};

export type TableCellAttrs = {
  borders?: CellBorders;
  padding?: BoxSpacing;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  background?: string;
  tableCellProperties?: Record<string, unknown>;
};

export type TableAttrs = {
  borders?: TableBorders;
  borderCollapse?: 'collapse' | 'separate';
  cellSpacing?: number;
  sdt?: SdtMetadata;
  containerSdt?: SdtMetadata;
  [key: string]: unknown;
};

export type TableCell = {
  id: BlockId;
  paragraph: ParagraphBlock;
  rowSpan?: number;
  colSpan?: number;
  attrs?: TableCellAttrs;
};

export type TableRowAttrs = {
  tableRowProperties?: Record<string, unknown>;
};

export type TableRow = {
  id: BlockId;
  cells: TableCell[];
  attrs?: TableRowAttrs;
};

export type TableBlock = {
  kind: 'table';
  id: BlockId;
  rows: TableRow[];
  attrs?: TableAttrs;
  /** Column widths in pixels from OOXML w:tblGrid. */
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

export type ImageBlockAttrs = {
  sdt?: SdtMetadata;
  containerSdt?: SdtMetadata;
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
  type?: 'continuous' | 'nextPage' | 'evenPage' | 'oddPage';
  pageSize?: { w: number; h: number };
  orientation?: 'portrait' | 'landscape';
  margins: {
    header?: number;
    footer?: number;
    top?: number;
    bottom?: number;
  };
  numbering?: {
    format?: 'decimal' | 'lowerLetter' | 'upperLetter' | 'lowerRoman' | 'upperRoman';
    start?: number;
  };
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
  columns?: {
    count: number;
    gap: number;
    equalWidth?: boolean;
  };
  attrs?: {
    source?: string;
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

export type PageBreakBlock = {
  kind: 'pageBreak';
  id: BlockId;
  attrs?: Record<string, unknown>;
};

export type ColumnBreakBlock = {
  kind: 'columnBreak';
  id: BlockId;
  attrs?: Record<string, unknown>;
};

/** Positioning for anchored images (offsets in CSS px). */
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

/** Text wrapping for floating images (distances in px). */
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

/** Exclusion zone for text wrapping around anchored images. */
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
  beforeAutospacing?: boolean;
  afterAutospacing?: boolean;
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

export type ParagraphAttrs = {
  styleId?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  spacing?: ParagraphSpacing;
  contextualSpacing?: boolean;
  indent?: ParagraphIndent;
  numberingProperties?: Record<string, unknown>;
  borders?: ParagraphBorders;
  shading?: ParagraphShading;
  tabs?: TabStop[];
  decimalSeparator?: string;
  tabIntervalTwips?: number;
  keepNext?: boolean;
  keepLines?: boolean;
  trackedChangesMode?: TrackedChangesMode;
  trackedChangesEnabled?: boolean;
  direction?: 'ltr' | 'rtl';
  rtl?: boolean;
  isTocEntry?: boolean;
  tocInstruction?: string;
  /** Floating alignment for positioned paragraphs (from w:framePr/@w:xAlign). */
  floatAlignment?: 'left' | 'right' | 'center';
  /** Word paragraph layout output from @superdoc/word-layout. */
  wordLayout?: unknown;
  sdt?: SdtMetadata;
  /** Container SDT for blocks with both primary and container metadata. */
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

/** A measured line within a block, output by the measurer. */
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

export type SectionBreakMeasure = {
  kind: 'sectionBreak';
};

export type PageBreakMeasure = {
  kind: 'pageBreak';
};

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

/** A rendered page containing positioned fragments. Page numbers are 1-indexed. */
export type Page = {
  number: number;
  fragments: Fragment[];
  margins?: PageMargins;
  numberText?: string;
  size?: { w: number; h: number };
  orientation?: 'portrait' | 'landscape';
  sectionRefs?: {
    headerRefs?: { default?: string; first?: string; even?: string; odd?: string };
    footerRefs?: { default?: string; first?: string; even?: string; odd?: string };
  };
};

/** A paragraph fragment positioned on a page. */
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
  pmStart?: number;
  pmEnd?: number;
};

export type TableColumnBoundary = {
  index: number;
  x: number;
  width: number;
  minWidth: number;
  resizable: boolean;
};

export type TableRowBoundary = {
  index: number;
  y: number;
  height: number;
};

export type TableFragmentMetadata = {
  columnBoundaries: TableColumnBoundary[];
  rowBoundaries?: TableRowBoundary[];
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

export type HeaderFooterType = 'default' | 'first' | 'even' | 'odd';

export type HeaderFooterPage = {
  number: number;
  fragments: Fragment[];
  numberText?: string;
};

export type HeaderFooterLayout = {
  height: number;
  minY?: number;
  maxY?: number;
  pages: HeaderFooterPage[];
};

/** Final layout output ready for painting. */
export type Layout = {
  pageSize: { w: number; h: number };
  pages: Page[];
  columns?: ColumnLayout;
  headerFooter?: Partial<Record<HeaderFooterType, HeaderFooterLayout>>;
};

export interface PainterDOM {
  paint(layout: Layout, mount: HTMLElement): void;
  setData?(
    blocks: FlowBlock[],
    measures: Measure[],
    headerBlocks?: FlowBlock[],
    headerMeasures?: Measure[],
    footerBlocks?: FlowBlock[],
    footerMeasures?: Measure[],
  ): void;
}

export interface PainterPDF {
  render(layout: Layout): Promise<Blob>;
}

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

export * as Engines from './engines/index.js';
