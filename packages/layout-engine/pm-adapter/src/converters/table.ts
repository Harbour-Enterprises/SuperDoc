/**
 * Table Node Converter
 *
 * Handles conversion of ProseMirror table nodes to TableBlocks
 */

import type {
  BoxSpacing,
  FlowBlock,
  ParagraphBlock,
  ImageBlock,
  DrawingBlock,
  TableCell,
  TableCellAttrs,
  TableBorders,
  TableRow,
  TableRowAttrs,
  TableBlock,
  TableAnchor,
  TableWrap,
} from '@superdoc/contracts';
import type {
  PMNode,
  NodeHandlerContext,
  BlockIdGenerator,
  PositionMap,
  StyleContext,
  TrackedChangesConfig,
  HyperlinkConfig,
  ThemeColorPalette,
  ConverterContext,
  ListCounterContext,
} from '../types.js';
import { extractTableBorders, extractCellBorders, extractCellPadding } from '../attributes/index.js';
import { pickNumber, twipsToPx } from '../utilities.js';
import { hydrateTableStyleAttrs } from './table-styles.js';

type ParagraphConverter = (
  node: PMNode,
  nextBlockId: BlockIdGenerator,
  positions: PositionMap,
  defaultFont: string,
  defaultSize: number,
  styleContext: StyleContext,
  listCounterContext?: ListCounterContext,
  trackedChanges?: TrackedChangesConfig,
  bookmarks?: Map<string, number>,
  hyperlinkConfig?: HyperlinkConfig,
  themeColors?: ThemeColorPalette,
  converterContext?: ConverterContext,
) => FlowBlock[];

type TableParserDependencies = {
  nextBlockId: BlockIdGenerator;
  positions: PositionMap;
  defaultFont: string;
  defaultSize: number;
  styleContext: StyleContext;
  trackedChanges?: TrackedChangesConfig;
  bookmarks?: Map<string, number>;
  hyperlinkConfig?: HyperlinkConfig;
  themeColors?: ThemeColorPalette;
  paragraphToFlowBlocks: ParagraphConverter;
  converterContext?: ConverterContext;
};

type ParseTableCellArgs = {
  cellNode: PMNode;
  rowIndex: number;
  cellIndex: number;
  context: TableParserDependencies;
  defaultCellPadding?: BoxSpacing;
};

type ParseTableRowArgs = {
  rowNode: PMNode;
  rowIndex: number;
  context: TableParserDependencies;
  defaultCellPadding?: BoxSpacing;
};

const isTableRowNode = (node: PMNode): boolean => node.type === 'tableRow' || node.type === 'table_row';

const isTableCellNode = (node: PMNode): boolean =>
  node.type === 'tableCell' ||
  node.type === 'table_cell' ||
  node.type === 'tableHeader' ||
  node.type === 'table_header';

type NormalizedRowHeight =
  | {
      value: number;
      rule: 'exact' | 'atLeast' | 'auto';
    }
  | undefined;

const normalizeRowHeight = (rowProps?: Record<string, unknown>): NormalizedRowHeight => {
  if (!rowProps || typeof rowProps !== 'object') return undefined;
  const rawRowHeight = (rowProps as Record<string, unknown>).rowHeight;
  if (!rawRowHeight || typeof rawRowHeight !== 'object') return undefined;

  const heightObj = rawRowHeight as Record<string, unknown>;
  const rawValue = pickNumber(heightObj.value ?? heightObj.val);
  if (rawValue == null) return undefined;

  const rawRule = heightObj.rule ?? heightObj.hRule;
  const rule =
    rawRule === 'exact' || rawRule === 'atLeast' || rawRule === 'auto'
      ? (rawRule as 'exact' | 'atLeast' | 'auto')
      : 'atLeast';

  // Row heights from DOCX are typically in twips. Use a heuristic to avoid double-converting pixel values:
  // convert when the value looks large enough to be twips (>= 300 twips ≈ 20px).
  const isLikelyTwips = rawValue >= 300 || Math.abs(rawValue % 15) < 1e-6;
  const valuePx = isLikelyTwips ? twipsToPx(rawValue) : rawValue;

  return {
    value: valuePx,
    rule,
  };
};

const parseTableCell = (args: ParseTableCellArgs): TableCell | null => {
  const { cellNode, rowIndex, cellIndex, context, defaultCellPadding } = args;
  if (!isTableCellNode(cellNode) || !Array.isArray(cellNode.content)) {
    return null;
  }

  // Convert all paragraphs in the cell to blocks
  // Note: Table cells can only contain paragraphs, images, and drawings (not nested tables)
  const blocks: (ParagraphBlock | ImageBlock | DrawingBlock)[] = [];

  for (const childNode of cellNode.content) {
    if (childNode.type === 'paragraph') {
      const paragraphBlocks = context.paragraphToFlowBlocks(
        childNode,
        context.nextBlockId,
        context.positions,
        context.defaultFont,
        context.defaultSize,
        context.styleContext,
        undefined,
        context.trackedChanges,
        context.bookmarks,
        context.hyperlinkConfig,
        context.themeColors,
        context.converterContext,
      );
      const paragraph = paragraphBlocks.find((b): b is ParagraphBlock => b.kind === 'paragraph');
      if (paragraph) {
        blocks.push(paragraph);
      }
    }
    // TODO: Add support for other block types (lists, images) if needed
  }

  if (blocks.length === 0) {
    return null;
  }

  const cellAttrs: TableCellAttrs = {};

  const borders = extractCellBorders(cellNode.attrs ?? {});
  if (borders) cellAttrs.borders = borders;

  const padding =
    extractCellPadding(cellNode.attrs ?? {}) ?? (defaultCellPadding ? { ...defaultCellPadding } : undefined);
  if (padding) cellAttrs.padding = padding;

  const verticalAlign = cellNode.attrs?.verticalAlign;
  const normalizedVerticalAlign =
    verticalAlign === 'middle' ? 'center' : verticalAlign === 'center' ? 'center' : verticalAlign;
  if (
    normalizedVerticalAlign === 'top' ||
    normalizedVerticalAlign === 'center' ||
    normalizedVerticalAlign === 'bottom'
  ) {
    cellAttrs.verticalAlign = normalizedVerticalAlign;
  }

  const background = cellNode.attrs?.background as { color?: string } | undefined;
  if (background && typeof background.color === 'string') {
    const bgColor = background.color;
    cellAttrs.background = bgColor.startsWith('#') ? bgColor : `#${bgColor}`;
  }

  const tableCellProperties = cellNode.attrs?.tableCellProperties;
  if (tableCellProperties && typeof tableCellProperties === 'object') {
    cellAttrs.tableCellProperties = tableCellProperties as Record<string, unknown>;
  }

  const rowSpan = pickNumber(cellNode.attrs?.rowspan);
  const colSpan = pickNumber(cellNode.attrs?.colspan);

  return {
    id: context.nextBlockId(`cell-${rowIndex}-${cellIndex}`),
    blocks,
    // Backward compatibility: set paragraph to first block if it's a paragraph
    paragraph: blocks[0]?.kind === 'paragraph' ? (blocks[0] as ParagraphBlock) : undefined,
    rowSpan: rowSpan ?? undefined,
    colSpan: colSpan ?? undefined,
    attrs: Object.keys(cellAttrs).length > 0 ? cellAttrs : undefined,
  };
};

const parseTableRow = (args: ParseTableRowArgs): TableRow | null => {
  const { rowNode, rowIndex, context, defaultCellPadding } = args;
  if (!isTableRowNode(rowNode) || !Array.isArray(rowNode.content)) {
    return null;
  }

  const cells: TableCell[] = [];
  rowNode.content.forEach((cellNode, cellIndex) => {
    const parsedCell = parseTableCell({
      cellNode,
      rowIndex,
      cellIndex,
      context,
      defaultCellPadding,
    });
    if (parsedCell) {
      cells.push(parsedCell);
    }
  });

  if (cells.length === 0) return null;

  const rowProps = rowNode.attrs?.tableRowProperties;
  const rowHeight = normalizeRowHeight(rowProps as Record<string, unknown> | undefined);
  const attrs: TableRowAttrs | undefined =
    rowProps && typeof rowProps === 'object'
      ? {
          tableRowProperties: rowProps as Record<string, unknown>,
          ...(rowHeight ? { rowHeight } : {}),
        }
      : rowHeight
        ? { rowHeight }
        : undefined;

  return {
    id: context.nextBlockId(`row-${rowIndex}`),
    cells,
    attrs,
  };
};

/**
 * Floating table properties from OOXML w:tblpPr.
 * Values are in twips.
 */
type FloatingTableProperties = {
  leftFromText?: number;
  rightFromText?: number;
  topFromText?: number;
  bottomFromText?: number;
  tblpX?: number;
  tblpY?: number;
  horzAnchor?: 'margin' | 'page' | 'text';
  vertAnchor?: 'margin' | 'page' | 'text';
  tblpXSpec?: 'left' | 'center' | 'right' | 'inside' | 'outside';
  tblpYSpec?: 'inline' | 'top' | 'center' | 'bottom' | 'inside' | 'outside';
};

/**
 * Extract floating table properties from node attrs and convert to TableAnchor and TableWrap.
 * Returns undefined values if the table is not floating (no tblpPr).
 */
function extractFloatingTableAnchorWrap(node: PMNode): { anchor?: TableAnchor; wrap?: TableWrap } {
  const tableProperties = node.attrs?.tableProperties as Record<string, unknown> | undefined;
  const floatingProps = tableProperties?.floatingTableProperties as FloatingTableProperties | undefined;

  if (!floatingProps) {
    return {};
  }

  // A table is considered anchored/floating if it has any positioning properties
  const hasPositioning =
    floatingProps.tblpX !== undefined ||
    floatingProps.tblpY !== undefined ||
    floatingProps.tblpXSpec !== undefined ||
    floatingProps.tblpYSpec !== undefined ||
    floatingProps.horzAnchor !== undefined ||
    floatingProps.vertAnchor !== undefined;

  if (!hasPositioning) {
    return {};
  }

  // Map OOXML anchor values to contract types
  const mapHorzAnchor = (val?: string): TableAnchor['hRelativeFrom'] => {
    switch (val) {
      case 'page':
        return 'page';
      case 'margin':
        return 'margin';
      case 'text':
      default:
        return 'column'; // 'text' in OOXML maps to column-relative positioning
    }
  };

  const mapVertAnchor = (val?: string): TableAnchor['vRelativeFrom'] => {
    switch (val) {
      case 'page':
        return 'page';
      case 'margin':
        return 'margin';
      case 'text':
      default:
        return 'paragraph'; // 'text' in OOXML maps to paragraph-relative positioning
    }
  };

  const anchor: TableAnchor = {
    isAnchored: true,
    hRelativeFrom: mapHorzAnchor(floatingProps.horzAnchor),
    vRelativeFrom: mapVertAnchor(floatingProps.vertAnchor),
  };

  // Set alignment from tblpXSpec/tblpYSpec if present
  if (floatingProps.tblpXSpec) {
    anchor.alignH = floatingProps.tblpXSpec;
  }
  if (floatingProps.tblpYSpec) {
    anchor.alignV = floatingProps.tblpYSpec;
  }

  // Set absolute offsets (convert twips to px)
  if (floatingProps.tblpX !== undefined) {
    anchor.offsetH = twipsToPx(floatingProps.tblpX);
  }
  if (floatingProps.tblpY !== undefined) {
    anchor.offsetV = twipsToPx(floatingProps.tblpY);
  }

  // Build wrap properties from text distances
  const hasDistances =
    floatingProps.leftFromText !== undefined ||
    floatingProps.rightFromText !== undefined ||
    floatingProps.topFromText !== undefined ||
    floatingProps.bottomFromText !== undefined;

  const wrap: TableWrap = {
    type: 'Square', // Floating tables with text distances use square wrapping
    wrapText: 'bothSides', // Default to text on both sides
  };

  if (hasDistances) {
    if (floatingProps.topFromText !== undefined) {
      wrap.distTop = twipsToPx(floatingProps.topFromText);
    }
    if (floatingProps.bottomFromText !== undefined) {
      wrap.distBottom = twipsToPx(floatingProps.bottomFromText);
    }
    if (floatingProps.leftFromText !== undefined) {
      wrap.distLeft = twipsToPx(floatingProps.leftFromText);
    }
    if (floatingProps.rightFromText !== undefined) {
      wrap.distRight = twipsToPx(floatingProps.rightFromText);
    }
  }

  return { anchor, wrap };
}

/**
 * Convert a ProseMirror table node to a TableBlock
 *
 * @param node - Table node to convert
 * @param nextBlockId - Block ID generator
 * @param positions - Position map for PM node tracking
 * @param defaultFont - Default font family
 * @param defaultSize - Default font size
 * @param _styleContext - Style context (unused in current implementation)
 * @param trackedChanges - Optional tracked changes configuration
 * @param bookmarks - Optional bookmark position map
 * @param hyperlinkConfig - Hyperlink configuration
 * @param paragraphToFlowBlocks - Paragraph converter function (injected to avoid circular deps)
 * @returns TableBlock or null if conversion fails
 */
export function tableNodeToBlock(
  node: PMNode,
  nextBlockId: BlockIdGenerator,
  positions: PositionMap,
  defaultFont: string,
  defaultSize: number,
  _styleContext: StyleContext,
  trackedChanges?: TrackedChangesConfig,
  bookmarks?: Map<string, number>,
  hyperlinkConfig?: HyperlinkConfig,
  themeColors?: ThemeColorPalette,
  paragraphToFlowBlocks?: (
    node: PMNode,
    nextBlockId: BlockIdGenerator,
    positions: PositionMap,
    defaultFont: string,
    defaultSize: number,
    styleContext: StyleContext,
    listCounterContext?: ListCounterContext,
    trackedChanges?: TrackedChangesConfig,
    bookmarks?: Map<string, number>,
    hyperlinkConfig?: HyperlinkConfig,
    themeColors?: ThemeColorPalette,
    converterContext?: ConverterContext,
  ) => FlowBlock[],
  converterContext?: ConverterContext,
): FlowBlock | null {
  if (!Array.isArray(node.content) || node.content.length === 0) return null;
  if (!paragraphToFlowBlocks) return null;

  const parserDeps: TableParserDependencies = {
    nextBlockId,
    positions,
    defaultFont,
    defaultSize,
    styleContext: _styleContext,
    trackedChanges,
    bookmarks,
    hyperlinkConfig,
    themeColors,
    paragraphToFlowBlocks,
    converterContext,
  };

  const hydratedTableStyle = hydrateTableStyleAttrs(node, converterContext);
  const defaultCellPadding = hydratedTableStyle?.cellPadding;

  const rows: TableRow[] = [];
  node.content.forEach((rowNode, rowIndex) => {
    const parsedRow = parseTableRow({
      rowNode,
      rowIndex,
      context: parserDeps,
      defaultCellPadding,
    });
    if (parsedRow) {
      rows.push(parsedRow);
    }
  });

  if (rows.length === 0) return null;

  const tableAttrs: Record<string, unknown> = {};
  const getBorderSource = (): Record<string, unknown> | undefined => {
    if (node.attrs?.borders && typeof node.attrs.borders === 'object' && node.attrs.borders !== null) {
      return node.attrs.borders as Record<string, unknown>;
    }
    if (
      hydratedTableStyle?.borders &&
      typeof hydratedTableStyle.borders === 'object' &&
      hydratedTableStyle.borders !== null
    ) {
      return hydratedTableStyle.borders as Record<string, unknown>;
    }
    return undefined;
  };
  const borderSource = getBorderSource();
  const tableBorders: TableBorders | undefined = extractTableBorders(borderSource);
  if (tableBorders) tableAttrs.borders = tableBorders;

  if (node.attrs?.borderCollapse) {
    tableAttrs.borderCollapse = node.attrs.borderCollapse;
  }

  if (node.attrs?.tableCellSpacing) {
    tableAttrs.cellSpacing = node.attrs.tableCellSpacing;
  }

  if (node.attrs?.justification) {
    tableAttrs.justification = node.attrs.justification;
  } else if (hydratedTableStyle?.justification) {
    tableAttrs.justification = hydratedTableStyle.justification;
  }

  if (node.attrs?.tableWidth) {
    tableAttrs.tableWidth = node.attrs.tableWidth;
  } else if (hydratedTableStyle?.tableWidth) {
    tableAttrs.tableWidth = hydratedTableStyle.tableWidth;
  }

  // Pass tableLayout through (extracted by tblLayout-translator.js)
  const tableLayout = node.attrs?.tableLayout;
  if (tableLayout) {
    tableAttrs.tableLayout = tableLayout;
  }

  let columnWidths: number[] | undefined = undefined;

  const twipsToPixels = (twips: number): number => {
    const PIXELS_PER_INCH = 96;
    return (twips / 1440) * PIXELS_PER_INCH;
  };

  /**
   * Column width priority hierarchy (per plan Phase 3):
   * 1. User-edited grid (userEdited flag + grid attribute)
   * 2. PM colwidth attributes (fallback for PM-native edits)
   * 3. Original OOXML grid (untouched documents)
   * 4. Auto-calculate from content (no explicit widths)
   *
   * When both grid and colwidth are present:
   * - If userEdited=true: use grid (Priority 1)
   * - Otherwise: use colwidth (Priority 2) over grid (Priority 3)
   */

  // Priority 1: User-edited grid (preserves resize operations)
  const hasUserEditedGrid =
    node.attrs?.userEdited === true && Array.isArray(node.attrs?.grid) && node.attrs.grid.length > 0;

  if (hasUserEditedGrid) {
    columnWidths = (node.attrs!.grid as Array<{ col?: number } | null | undefined>)
      .filter((col): col is { col?: number } => col != null && typeof col === 'object')
      .map((col) => {
        const twips = typeof col.col === 'number' ? col.col : 0;
        return twips > 0 ? twipsToPixels(twips) : 0;
      })
      .filter((width: number) => width > 0);

    if (columnWidths.length === 0) {
      columnWidths = undefined;
    }
  }

  // Priority 2: PM colwidth attributes (higher priority than grid when userEdited !== true)
  if (!columnWidths && Array.isArray(node.content) && node.content.length > 0) {
    const firstRow = node.content[0];
    if (firstRow && isTableRowNode(firstRow) && Array.isArray(firstRow.content) && firstRow.content.length > 0) {
      const tempWidths: number[] = [];
      for (const cellNode of firstRow.content) {
        if (cellNode && isTableCellNode(cellNode) && cellNode.attrs?.colwidth !== undefined) {
          const colwidth = cellNode.attrs.colwidth;
          if (Array.isArray(colwidth)) {
            tempWidths.push(...colwidth.filter((w) => typeof w === 'number' && w > 0));
          } else if (typeof colwidth === 'number' && colwidth > 0) {
            tempWidths.push(colwidth);
          }
        }
      }
      if (tempWidths.length > 0) {
        columnWidths = tempWidths;
      }
    }
  }

  // Priority 3: Original OOXML grid (fallback when no colwidth)
  if (!columnWidths && Array.isArray(node.attrs?.grid) && node.attrs.grid.length > 0) {
    columnWidths = (node.attrs.grid as Array<{ col?: number } | null | undefined>)
      .filter((col): col is { col?: number } => col != null && typeof col === 'object')
      .map((col) => {
        const twips = typeof col.col === 'number' ? col.col : 0;
        return twips > 0 ? twipsToPixels(twips) : 0;
      })
      .filter((width: number) => width > 0);

    if (columnWidths.length === 0) {
      columnWidths = undefined;
    }
  }

  // Priority 4: Auto-calculate from content (columnWidths remains undefined)

  // Extract floating table anchor/wrap properties
  const { anchor, wrap } = extractFloatingTableAnchorWrap(node);

  const tableBlock: TableBlock = {
    kind: 'table',
    id: nextBlockId('table'),
    rows,
    attrs: Object.keys(tableAttrs).length > 0 ? tableAttrs : undefined,
    columnWidths,
    ...(anchor ? { anchor } : {}),
    ...(wrap ? { wrap } : {}),
  };

  return tableBlock;
}

/**
 * Handle table nodes.
 * Converts table node to table block.
 *
 * @param node - Table node to process
 * @param context - Shared handler context
 */
export function handleTableNode(node: PMNode, context: NodeHandlerContext): void {
  const {
    blocks,
    recordBlockKind,
    nextBlockId,
    positions,
    defaultFont,
    defaultSize,
    styleContext,
    trackedChangesConfig,
    bookmarks,
    hyperlinkConfig,
    converters,
    converterContext,
  } = context;

  const tableBlock = tableNodeToBlock(
    node,
    nextBlockId,
    positions,
    defaultFont,
    defaultSize,
    styleContext,
    trackedChangesConfig,
    bookmarks,
    hyperlinkConfig,
    undefined, // themeColors
    converters?.paragraphToFlowBlocks,
    converterContext,
  );
  if (tableBlock) {
    blocks.push(tableBlock);
    recordBlockKind(tableBlock.kind);
  }
}
