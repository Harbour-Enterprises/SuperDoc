import type {
  TableBlock,
  TableMeasure,
  TableFragment,
  TableColumnBoundary,
  TableFragmentMetadata,
  TableRowMeasure,
  TableRow,
  PartialRowInfo,
  ParagraphMeasure,
} from '@superdoc/contracts';
import type { PageState } from './paginator.js';

export type TableLayoutContext = {
  block: TableBlock;
  measure: TableMeasure;
  columnWidth: number;
  ensurePage: () => PageState;
  advanceColumn: (state: PageState) => PageState;
  columnX: (columnIndex: number) => number;
};

/**
 * Safely extract the tableIndent width value from table attributes.
 *
 * The tableIndent attribute controls horizontal offset of tables from the left margin.
 * Negative values are supported and allow tables to extend into the left margin,
 * matching Microsoft Word behavior.
 *
 * Edge cases handled:
 * - Missing attrs object: Returns 0
 * - Missing tableIndent property: Returns 0
 * - tableIndent is not an object: Returns 0
 * - tableIndent.width is missing: Returns 0
 * - tableIndent.width is not a number: Returns 0
 * - tableIndent.width is NaN: Returns 0
 * - tableIndent.width is Infinity/-Infinity: Returns 0
 *
 * @param attrs - Table attributes object (may be undefined)
 * @returns Table indent width in pixels, or 0 if invalid/missing
 *
 * @example
 * ```typescript
 * // Valid positive indent (table moves right)
 * getTableIndentWidth({ tableIndent: { width: 50 } }); // returns 50
 *
 * // Valid negative indent (table extends into left margin)
 * getTableIndentWidth({ tableIndent: { width: -20 } }); // returns -20
 *
 * // Invalid cases - all return 0
 * getTableIndentWidth(undefined); // returns 0
 * getTableIndentWidth({}); // returns 0
 * getTableIndentWidth({ tableIndent: null }); // returns 0
 * getTableIndentWidth({ tableIndent: { width: 'invalid' } }); // returns 0
 * getTableIndentWidth({ tableIndent: { width: NaN } }); // returns 0
 * ```
 */
function getTableIndentWidth(attrs: TableBlock['attrs']): number {
  // Guard: attrs must be defined
  if (!attrs) {
    return 0;
  }

  // Guard: tableIndent must exist and be an object
  const tableIndent = attrs.tableIndent;
  if (!tableIndent || typeof tableIndent !== 'object') {
    return 0;
  }

  // Guard: width must exist in tableIndent
  const width = (tableIndent as Record<string, unknown>).width;
  if (width === undefined || width === null) {
    return 0;
  }

  // Guard: width must be a number
  if (typeof width !== 'number') {
    return 0;
  }

  // Guard: width must be finite (not NaN or Infinity)
  if (!Number.isFinite(width)) {
    return 0;
  }

  return width;
}

/**
 * Apply table indent offset to x position and width, ensuring width never goes negative.
 *
 * When a table has a tableIndent offset:
 * - Positive indent: Shifts table right, reduces available width
 * - Negative indent: Shifts table left (into margin), increases available width
 *
 * Width clamping prevents negative widths when indent is larger than available space,
 * which would cause rendering issues. This is an edge case but must be handled safely.
 *
 * @param x - Original x position in pixels
 * @param width - Original width in pixels
 * @param indent - Table indent offset in pixels (positive or negative)
 * @returns Object with adjusted x and width values
 *
 * @remarks
 * Width clamping to 0 is a defensive measure. In production scenarios, this should
 * rarely occur as the layout engine typically allocates sufficient column width.
 * However, when it does occur (e.g., extreme negative indent or narrow columns),
 * clamping prevents undefined behavior in the rendering layer.
 *
 * @example
 * ```typescript
 * // Normal positive indent
 * applyTableIndent(100, 400, 50);
 * // returns { x: 150, width: 350 }
 *
 * // Normal negative indent (extends into margin)
 * applyTableIndent(100, 400, -20);
 * // returns { x: 80, width: 420 }
 *
 * // Edge case: indent exceeds width (clamped)
 * applyTableIndent(100, 200, 250);
 * // returns { x: 350, width: 0 }
 *
 * // Zero indent (no change)
 * applyTableIndent(100, 400, 0);
 * // returns { x: 100, width: 400 }
 * ```
 */
function applyTableIndent(x: number, width: number, indent: number): { x: number; width: number } {
  return {
    x: x + indent,
    width: Math.max(0, width - indent),
  };
}

/**
 * Calculate minimum width for a table column based on cell content.
 *
 * For now, uses a conservative minimum of 25px per column as the layout engine
 * doesn't yet track word-level measurements. Future enhancement: scan cell
 * paragraph measures for longest unbreakable word or image width.
 *
 * Edge cases handled:
 * - Out of bounds column index: Returns DEFAULT_MIN_WIDTH (25px)
 * - Negative or zero widths: Returns DEFAULT_MIN_WIDTH (25px)
 * - Very wide columns (>200px): Capped at 200px for better UX
 * - Empty columnWidths array: Returns DEFAULT_MIN_WIDTH (25px)
 *
 * @param columnIndex - Column index to calculate minimum for (0-based)
 * @param measure - Table measurement data containing columnWidths array
 * @returns Minimum width in pixels, guaranteed to be between 25px and 200px
 */
function calculateColumnMinWidth(columnIndex: number, measure: TableMeasure): number {
  const DEFAULT_MIN_WIDTH = 25; // Minimum usable column width in pixels

  // Future enhancement: compute actual minimum based on cell content
  // For now, use measured width but constrain to reasonable minimum
  const measuredWidth = measure.columnWidths[columnIndex] || DEFAULT_MIN_WIDTH;

  // Don't allow columns to shrink below absolute minimum, but cap at reasonable max
  // The 200px cap prevents overly wide minimum widths from making columns too rigid.
  // This allows columns that are initially wide to still be resizable down to more
  // reasonable widths. For example, a 500px column can be resized down to 200px minimum
  // rather than being locked at 500px. This provides better UX for table editing.
  return Math.max(DEFAULT_MIN_WIDTH, Math.min(measuredWidth, 200));
}

/**
 * Generate column boundary metadata for interactive table resizing.
 *
 * Creates metadata that enables the overlay component to position resize handles
 * and enforce minimum width constraints during drag operations.
 *
 * The generated metadata includes:
 * - Column index (for identifying which column to resize)
 * - X position (for positioning resize handles)
 * - Current width (for calculating new widths during resize)
 * - Minimum width (for constraining resize operations)
 * - Resizable flag (currently always true, future: lock specific columns)
 *
 * Edge cases handled:
 * - Empty columnWidths array: Returns empty array (no boundaries)
 * - Single column: Returns one boundary with proper min/max constraints
 * - Very wide/narrow columns: Handled by calculateColumnMinWidth
 *
 * @param measure - Table measurement containing column widths
 * @returns Array of column boundary metadata, one per column
 */
function generateColumnBoundaries(measure: TableMeasure): TableColumnBoundary[] {
  const boundaries: TableColumnBoundary[] = [];
  let xPosition = 0;

  for (let i = 0; i < measure.columnWidths.length; i++) {
    const width = measure.columnWidths[i];
    const minWidth = calculateColumnMinWidth(i, measure);

    const boundary = {
      index: i,
      x: xPosition,
      width,
      minWidth,
      resizable: true, // All columns resizable initially
    };

    boundaries.push(boundary);

    xPosition += width;
  }

  return boundaries;
}

/**
 * Count contiguous header rows from the beginning of the table.
 *
 * Header rows are identified by the `repeatHeader` attribute in tableRowProperties.
 * Only contiguous header rows from row 0 are counted; the first non-header row
 * terminates the count.
 *
 * @param block - Table block containing rows and attributes
 * @returns Number of contiguous header rows from row 0
 */
function countHeaderRows(block: TableBlock): number {
  let count = 0;
  for (let i = 0; i < block.rows.length; i++) {
    const row = block.rows[i];
    const repeatHeader = row.attrs?.tableRowProperties?.repeatHeader;
    if (repeatHeader === true) {
      count++;
    } else {
      // Stop at first non-header row
      break;
    }
  }
  return count;
}

/**
 * Sum row heights for a given range.
 *
 * @param rows - Array of measured table rows
 * @param fromRow - Starting row index (inclusive)
 * @param toRow - Ending row index (exclusive)
 * @returns Total height in pixels
 */
function sumRowHeights(rows: TableRowMeasure[], fromRow: number, toRow: number): number {
  let total = 0;
  for (let i = fromRow; i < toRow && i < rows.length; i++) {
    total += rows[i].height;
  }
  return total;
}

/**
 * Calculate the actual rendered height of a table fragment.
 *
 * CRITICAL: This is used for cursor advancement, not measure.totalHeight.
 * Fragment height = (repeated headers) + (body rows from fromRow to toRow)
 *
 * @param fragment - Table fragment with fromRow, toRow, repeatHeaderCount
 * @param measure - Table measurements
 * @param headerCount - Total number of header rows in the table
 * @returns Actual fragment height in pixels
 */
function calculateFragmentHeight(
  fragment: Pick<TableFragment, 'fromRow' | 'toRow' | 'repeatHeaderCount'>,
  measure: TableMeasure,
  _headerCount: number,
): number {
  let height = 0;

  // Add header height if continuation with repeated headers
  if (fragment.repeatHeaderCount && fragment.repeatHeaderCount > 0) {
    height += sumRowHeights(measure.rows, 0, fragment.repeatHeaderCount);
  }

  // Add body row heights (fromRow to toRow, exclusive)
  height += sumRowHeights(measure.rows, fragment.fromRow, fragment.toRow);

  return height;
}

type SplitPointResult = {
  endRow: number; // Exclusive row index (next row after last included)
  partialRow: PartialRowInfo | null; // Null for row-boundary splits, PartialRowInfo for mid-row splits
};

/**
 * Minimum height in pixels required to render a partial row.
 * Below this threshold, we don't attempt mid-row splits as there's
 * insufficient space to render even a single line of text.
 */
const MIN_PARTIAL_ROW_HEIGHT = 20;

/**
 * Get all lines from a cell's blocks (multi-block or single paragraph).
 *
 * Cells can have multiple blocks (cell.blocks) or a single paragraph (cell.paragraph).
 * This function normalizes access to all lines across all paragraph blocks.
 *
 * @param cell - Cell measure
 * @returns Array of all lines with their lineHeight
 */
function getCellLines(cell: TableRowMeasure['cells'][number]): Array<{ lineHeight: number }> {
  // Multi-block cells use the `blocks` array
  if (cell.blocks && cell.blocks.length > 0) {
    const allLines: Array<{ lineHeight: number }> = [];
    for (const block of cell.blocks) {
      if (block.kind === 'paragraph') {
        // Type guard ensures block is ParagraphMeasure
        if (block.kind === 'paragraph' && 'lines' in block) {
          const paraBlock = block as ParagraphMeasure;
          if (paraBlock.lines) {
            allLines.push(...paraBlock.lines);
          }
        }
      }
    }
    return allLines;
  }

  // Fallback to single paragraph (backward compatibility)
  if (cell.paragraph?.lines) {
    return cell.paragraph.lines;
  }

  return [];
}

/**
 * Calculate the height of lines from startLine to endLine for a cell.
 *
 * @param cell - Cell measure containing paragraph with lines
 * @param fromLine - Starting line index (inclusive, must be >= 0)
 * @param toLine - Ending line index (exclusive), -1 means to end
 * @returns Height in pixels
 */
function _calculateCellLinesHeight(cell: TableRowMeasure['cells'][number], fromLine: number, toLine: number): number {
  if (fromLine < 0) {
    throw new Error(`Invalid fromLine ${fromLine}: must be >= 0`);
  }
  const lines = getCellLines(cell);
  const endLine = toLine === -1 ? lines.length : toLine;
  let height = 0;
  for (let i = fromLine; i < endLine && i < lines.length; i++) {
    height += lines[i].lineHeight || 0;
  }
  return height;
}

type CellPadding = { top: number; bottom: number; left: number; right: number };

function getCellPadding(cellIdx: number, blockRow?: TableRow): CellPadding {
  const padding = blockRow?.cells?.[cellIdx]?.attrs?.padding ?? {};
  return {
    top: padding.top ?? 2,
    bottom: padding.bottom ?? 2,
    left: padding.left ?? 4,
    right: padding.right ?? 4,
  };
}

/**
 * Get total line count for a cell across all its paragraph blocks.
 *
 * @param cell - Cell measure
 * @returns Total number of lines
 */
function getCellTotalLines(cell: TableRowMeasure['cells'][number]): number {
  return getCellLines(cell).length;
}

/**
 * Compute partial row split information for rows that don't fit.
 *
 * When a row exceeds the available height and cantSplit is not set,
 * this function calculates where to split within the row by finding
 * a common line advancement across all cells, ensuring structural alignment.
 *
 * Algorithm (Two-Pass):
 *
 * Pass 1 - Initial Line Fitting:
 * 1. For each cell, calculate available height for lines (subtract padding)
 * 2. Find cumulative line heights and determine initial cutoff point per cell
 * 3. Calculate the actual height of lines that fit for each cell
 * 4. Check if all cells completed their content in this pass
 *
 * Pass 2 - Line Advancement Alignment:
 * 1. Calculate line advancement for each cell (cutLine - startLine)
 * 2. Find minimum line advancement across all cells
 * 3. If all cells completed in pass 1, keep the pass 1 results (optimization)
 * 4. Otherwise, recalculate cutoffs so all cells advance by the same number of lines
 *
 * Why Line Advancement Instead of Minimum Height:
 * Using minimum line advancement (instead of minimum height) ensures that all cells
 * advance by the same number of lines, which maintains structural alignment across
 * cells. This prevents scenarios where cells with different line heights would
 * desynchronize, causing layout inconsistencies in multi-part row splits.
 *
 * Optimization - allCellsCompleteInFirstPass:
 * When all cells complete their remaining content in the first pass, we skip the
 * line advancement normalization. This allows the last fragment of a split row to
 * use the natural heights without artificial constraints, improving space utilization.
 *
 * @param rowIndex - Index of the row to split
 * @param blockRow - Table row data for accessing cell attributes (padding, etc.)
 * @param measure - Table measurements with cell line data
 * @param availableHeight - Available vertical space for the partial row
 * @param fromLineByCell - Starting line indices per cell (for continuations)
 * @returns PartialRowInfo with line cutoffs per cell, partial height, and split flags
 */
function computePartialRow(
  rowIndex: number,
  blockRow: TableRow | undefined,
  measure: TableMeasure,
  availableHeight: number,
  fromLineByCell?: number[],
): PartialRowInfo {
  const row = measure.rows[rowIndex];
  if (!row) {
    throw new Error(`Invalid rowIndex ${rowIndex}: measure.rows has ${measure.rows.length} rows`);
  }
  const cellCount = row.cells.length;

  // Initialize fromLineByCell if not provided (first part of split)
  const startLines = fromLineByCell || new Array(cellCount).fill(0);
  const toLineByCell: number[] = [];
  const heightByCell: number[] = [];

  // Capture cell paddings to keep height math aligned with rendering
  const cellPaddings = row.cells.map((_, idx: number) => getCellPadding(idx, blockRow));

  // First pass: find cutoff for each cell based on available height
  for (let cellIdx = 0; cellIdx < cellCount; cellIdx++) {
    const cell = row.cells[cellIdx];
    const startLine = startLines[cellIdx] || 0;

    // Calculate available height for lines (subtract this cell's padding)
    const cellPadding = cellPaddings[cellIdx];
    const availableForLines = Math.max(0, availableHeight - (cellPadding.top + cellPadding.bottom));

    // Get all lines from all blocks in this cell (multi-block support)
    const lines = getCellLines(cell);
    let cumulativeHeight = 0;
    let cutLine = startLine;

    for (let i = startLine; i < lines.length; i++) {
      const lineHeight = lines[i].lineHeight || 0;
      if (cumulativeHeight + lineHeight > availableForLines) {
        break; // Can't fit this line
      }
      cumulativeHeight += lineHeight;
      cutLine = i + 1; // Exclusive index
    }

    toLineByCell.push(cutLine);
    heightByCell.push(cumulativeHeight);
  }

  // Check if ALL cells completed their remaining content in the first pass
  const allCellsCompleteInFirstPass: boolean = toLineByCell.every((cutLine, idx: number) => {
    const totalLines = getCellTotalLines(row.cells[idx]);
    return cutLine >= totalLines;
  });

  // Calculate line advancement for each cell (how many lines advanced from startLine)
  const lineAdvancements: number[] = toLineByCell.map((cutLine, idx: number) => cutLine - (startLines[idx] || 0));

  // Find minimum LINE ADVANCEMENT across cells (not minimum height!)
  // This ensures all cells advance by the same number of lines, keeping structural alignment
  const positiveAdvancements = lineAdvancements.filter((adv) => adv > 0);
  const minLineAdvancement = positiveAdvancements.length > 0 ? Math.min(...positiveAdvancements) : 0;

  // Second pass: adjust cutoffs to match the minimum line advancement
  // BUT: Skip this adjustment if all cells already completed - no need to artificially limit
  let actualPartialHeight = 0;
  let maxPaddingTotal = 0;
  for (let cellIdx = 0; cellIdx < cellCount; cellIdx++) {
    const cell = row.cells[cellIdx];
    const startLine = startLines[cellIdx] || 0;
    const lines = getCellLines(cell);
    const cellPadding = cellPaddings[cellIdx];
    const paddingTotal = cellPadding.top + cellPadding.bottom;
    maxPaddingTotal = Math.max(maxPaddingTotal, paddingTotal);

    // If all cells completed in first pass, keep the first pass results
    if (allCellsCompleteInFirstPass) {
      // Keep toLineByCell[cellIdx] as-is from first pass
      actualPartialHeight = Math.max(actualPartialHeight, heightByCell[cellIdx] + paddingTotal);
    } else {
      // Recalculate at minimum LINE ADVANCEMENT for consistent structural alignment
      // Each cell advances by the same number of lines
      const targetLine = Math.min(startLine + minLineAdvancement, lines.length);
      let cumulativeHeight = 0;

      for (let i = startLine; i < targetLine; i++) {
        cumulativeHeight += lines[i].lineHeight || 0;
      }

      toLineByCell[cellIdx] = targetLine;
      actualPartialHeight = Math.max(actualPartialHeight, cumulativeHeight + paddingTotal);
    }
  }

  // CRITICAL: Check if we made any progress (advanced any lines)
  const madeProgress = toLineByCell.some((cutLine, idx: number) => cutLine > (startLines[idx] || 0));

  const isFirstPart = startLines.every((l) => l === 0);

  // Determine if this is the last part (all cells exhausted OR no progress made)
  const allCellsExhausted = toLineByCell.every((cutLine, idx: number) => {
    const totalLines = getCellTotalLines(row.cells[idx]);
    return cutLine >= totalLines;
  });
  const isLastPart = allCellsExhausted || !madeProgress;

  // Ensure the partial height includes at least padding when we have content to render
  if (actualPartialHeight === 0 && isFirstPart) {
    actualPartialHeight = maxPaddingTotal;
  }

  return {
    rowIndex,
    fromLineByCell: startLines,
    toLineByCell,
    isFirstPart,
    isLastPart,
    partialHeight: actualPartialHeight,
  };
}

/**
 * Find the split point for table rows given available height and constraints.
 *
 * Algorithm:
 * 1. Iterate rows from startRow, accumulating heights
 * 2. Check cantSplit attribute for each row
 * 3. Return endRow (exclusive) where split should occur
 * 4. For rows that don't fit AND don't have cantSplit, split mid-row using computePartialRow()
 * 5. For over-tall rows (row > fullPageHeight), force mid-row split even with cantSplit
 *
 * MS Word Behavior:
 * - Default: Rows CAN break across pages (cantSplit = false by default)
 * - When a row doesn't fit and cantSplit is false, Word splits mid-row at line boundaries
 * - cantSplit = true prevents mid-row splitting; row moves to next page
 * - Even with cantSplit, rows taller than a full page must split
 *
 * @param block - Table block
 * @param measure - Table measurements
 * @param startRow - Starting row index (inclusive)
 * @param availableHeight - Available vertical space
 * @param fullPageHeight - Full page height (for detecting over-tall rows)
 * @param pendingPartialRow - If continuing a partial row from previous page
 * @returns Split point result with endRow and partialRow
 */
function findSplitPoint(
  block: TableBlock,
  measure: TableMeasure,
  startRow: number,
  availableHeight: number,
  fullPageHeight?: number,
  _pendingPartialRow?: PartialRowInfo | null,
): SplitPointResult {
  let accumulatedHeight = 0;
  let lastFitRow = startRow; // Last row that fit completely

  for (let i = startRow; i < block.rows.length; i++) {
    const row = block.rows[i];
    const rowHeight = measure.rows[i]?.height || 0;
    const cantSplit = row.attrs?.tableRowProperties?.cantSplit === true;

    // Check if this row fits completely
    if (accumulatedHeight + rowHeight <= availableHeight) {
      // Row fits completely
      accumulatedHeight += rowHeight;
      lastFitRow = i + 1; // Next row index (exclusive)
    } else {
      // Row doesn't fit completely
      const remainingHeight = availableHeight - accumulatedHeight;

      // Check if this is an over-tall row (exceeds full page height) - force split regardless of cantSplit
      // This handles edge case where a row is taller than an entire page
      if (fullPageHeight && rowHeight > fullPageHeight) {
        const partialRow = computePartialRow(i, block.rows[i], measure, remainingHeight);
        return { endRow: i + 1, partialRow };
      }

      // If row has cantSplit, don't split it - break before this row
      if (cantSplit) {
        // If we haven't fit any rows yet, return startRow to trigger page advance
        if (lastFitRow === startRow) {
          return { endRow: startRow, partialRow: null };
        }
        // Break before the cantSplit row
        return { endRow: lastFitRow, partialRow: null };
      }

      // Row doesn't have cantSplit - try to split mid-row (MS Word default behavior)
      // Only split if we have meaningful space (at least MIN_PARTIAL_ROW_HEIGHT for one line)
      if (remainingHeight >= MIN_PARTIAL_ROW_HEIGHT) {
        const partialRow = computePartialRow(i, block.rows[i], measure, remainingHeight);

        // Check if we can actually fit any lines
        const hasContent = partialRow.toLineByCell.some(
          (cutLine: number, idx: number) => cutLine > (partialRow.fromLineByCell[idx] || 0),
        );

        if (hasContent) {
          // We can fit some content - do mid-row split
          return { endRow: i + 1, partialRow };
        }
      }

      // Can't fit any content from this row - break before it
      return { endRow: lastFitRow, partialRow: null };
    }
  }

  // All remaining rows fit
  return { endRow: block.rows.length, partialRow: null };
}

/**
 * Generate fragment metadata for a table fragment.
 *
 * Currently only includes column boundaries; row boundaries omitted to reduce DOM overhead.
 *
 * @param measure - Table measurements
 * @param fromRow - Starting row (unused but kept for future row boundaries)
 * @param toRow - Ending row (unused but kept for future row boundaries)
 * @param repeatHeaderCount - Header count (unused but kept for future metadata)
 * @returns Table fragment metadata
 */
function generateFragmentMetadata(
  measure: TableMeasure,
  _fromRow: number,
  _toRow: number,
  _repeatHeaderCount: number,
): TableFragmentMetadata {
  return {
    columnBoundaries: generateColumnBoundaries(measure),
    coordinateSystem: 'fragment',
  };
}

/**
 * Layout a table block with monolithic rendering (no splitting).
 *
 * Used for floating tables (tblpPr) which should not split across pages.
 *
 * @param context - Table layout context
 */
function layoutMonolithicTable(context: TableLayoutContext): void {
  let state = context.ensurePage();
  if (state.cursorY + context.measure.totalHeight > state.contentBottom && state.page.fragments.length > 0) {
    state = context.advanceColumn(state);
  }
  state = context.ensurePage();
  const height = Math.min(context.measure.totalHeight, state.contentBottom - state.cursorY);

  const metadata: TableFragmentMetadata = {
    columnBoundaries: generateColumnBoundaries(context.measure),
    coordinateSystem: 'fragment',
  };

  // Apply tableIndent offset (negative values extend table into left margin, matching Word behavior)
  const tableIndent = getTableIndentWidth(context.block.attrs);
  const baseX = context.columnX(state.columnIndex);
  const baseWidth = Math.min(context.columnWidth, context.measure.totalWidth || context.columnWidth);
  const { x, width } = applyTableIndent(baseX, baseWidth, tableIndent);

  const fragment: TableFragment = {
    kind: 'table',
    blockId: context.block.id,
    fromRow: 0,
    toRow: context.block.rows.length,
    x,
    y: state.cursorY,
    width,
    height,
    metadata,
  };
  state.page.fragments.push(fragment);
  state.cursorY += height;
}

/**
 * Layout a table block with row-boundary and mid-row splitting.
 *
 * Implements MS Word-compatible table splitting:
 * - Breaks tables at row boundaries when exceeding page height
 * - Splits rows mid-content when cantSplit is false (default)
 * - Respects cantSplit attribute (prevents row from splitting)
 * - Repeats header rows on continuation fragments
 * - Handles floating tables (tblpPr) with monolithic layout
 * - Tracks partial row continuations across pages
 *
 * Algorithm:
 * 1. Detect floating tables → delegate to monolithic layout
 * 2. Count header rows
 * 3. Loop through rows, finding split points
 * 4. When a partial row split occurs, track it for continuation
 * 5. Create fragments with proper fromRow/toRow/repeatHeaderCount/partialRow
 * 6. Advance cursor by actual fragment height (not total table height)
 *
 * @param context - Table layout context

 */
export function layoutTableBlock({
  block,
  measure,
  columnWidth,
  ensurePage,
  advanceColumn,
  columnX,
}: TableLayoutContext): void {
  // Skip anchored/floating tables handled by the float manager
  if (block.anchor?.isAnchored) {
    return;
  }

  // 1. Detect floating tables - use monolithic layout
  const tableProps = block.attrs?.tableProperties as Record<string, unknown> | undefined;
  const floatingProps = tableProps?.floatingTableProperties as Record<string, unknown> | undefined;
  if (floatingProps && Object.keys(floatingProps).length > 0) {
    layoutMonolithicTable({ block, measure, columnWidth, ensurePage, advanceColumn, columnX });
    return;
  }

  // 2. Count header rows
  const headerCount = countHeaderRows(block);
  const headerHeight = headerCount > 0 ? sumRowHeights(measure.rows, 0, headerCount) : 0;

  // 3. Initialize state
  let state = ensurePage();

  // Check if we need to advance column/page before starting the table
  // If the table doesn't fit in the current position and there's already content on the page,
  // move to the next column/page to avoid starting a table that immediately needs to split
  const availableHeight = state.contentBottom - state.cursorY;

  // Table start preflight check: Decide whether to start the table on the current page
  // or advance to a new page. This prevents starting a table that immediately splits,
  // which would waste the remaining space on the current page.
  const hasPriorFragments = state.page.fragments.length > 0;
  const hasMeasuredRows = measure.rows.length > 0 && block.rows.length > 0;

  if (hasMeasuredRows && hasPriorFragments) {
    // Decision tree for tables with measured rows and existing page content:
    const firstRowCantSplit = block.rows[0]?.attrs?.tableRowProperties?.cantSplit === true;
    const firstRowHeight = measure.rows[0]?.height ?? measure.totalHeight ?? 0;

    if (firstRowCantSplit) {
      // Branch 1: cantSplit row
      // Require the entire first row to fit on the current page.
      // If it doesn't fit, advance to a new page to avoid an immediate split.
      if (firstRowHeight > availableHeight) {
        state = advanceColumn(state);
      }
    } else {
      // Branch 2: Splittable row (cantSplit = false or undefined)
      // Allow the table to start on the current page if ANY content can fit.
      // Use computePartialRow to check if at least one line can be rendered.
      const partial = computePartialRow(0, block.rows[0], measure, availableHeight);
      const madeProgress = partial.toLineByCell.some(
        (toLine: number, idx: number) => toLine > (partial.fromLineByCell[idx] || 0),
      );
      const hasRenderableHeight = partial.partialHeight > 0;

      // Advance only if we can't fit any lines at all
      if (!madeProgress || !hasRenderableHeight) {
        state = advanceColumn(state);
      }
      // Otherwise, start on current page and let normal row processing handle the split
    }
  } else if (hasPriorFragments) {
    // Fallback for cases without measured rows (e.g., empty measure.rows)
    let minRequiredHeight = 0;
    if (measure.rows.length > 0) {
      minRequiredHeight = sumRowHeights(measure.rows, 0, 1);
    } else if (measure.totalHeight > 0) {
      minRequiredHeight = measure.totalHeight;
    }

    if (minRequiredHeight > availableHeight) {
      state = advanceColumn(state);
    }
  }

  let currentRow = 0;
  let isTableContinuation = false;
  let pendingPartialRow: PartialRowInfo | null = null;

  // Handle edge case: table with no rows but non-zero totalHeight
  // This can occur in test scenarios or with placeholder tables
  if (block.rows.length === 0 && measure.totalHeight > 0) {
    const height = Math.min(measure.totalHeight, state.contentBottom - state.cursorY);
    const metadata: TableFragmentMetadata = {
      columnBoundaries: generateColumnBoundaries(measure),
      coordinateSystem: 'fragment',
    };

    // Apply tableIndent offset (negative values extend table into left margin, matching Word behavior)
    const tableIndent = getTableIndentWidth(block.attrs);
    const baseX = columnX(state.columnIndex);
    const baseWidth = Math.min(columnWidth, measure.totalWidth || columnWidth);
    const { x, width } = applyTableIndent(baseX, baseWidth, tableIndent);

    const fragment: TableFragment = {
      kind: 'table',
      blockId: block.id,
      fromRow: 0,
      toRow: 0,
      x,
      y: state.cursorY,
      width,
      height,
      metadata,
    };
    state.page.fragments.push(fragment);
    state.cursorY += height;
    return;
  }

  // 4. Loop until all rows processed (including pending partial rows)
  while (currentRow < block.rows.length || pendingPartialRow !== null) {
    state = ensurePage();
    const availableHeight = state.contentBottom - state.cursorY;

    // Determine repeat header count for this fragment
    let repeatHeaderCount = 0;

    if (currentRow === 0 && !pendingPartialRow) {
      // First fragment: headers are part of body rows, don't repeat separately
      repeatHeaderCount = 0;
    } else {
      // Continuation fragment: check if headers should repeat
      if (headerCount > 0 && headerHeight <= availableHeight) {
        repeatHeaderCount = headerCount;
      } else if (headerCount > 0 && headerHeight > availableHeight) {
        // Table headers taller than page height - skip header repetition to avoid overflow
        repeatHeaderCount = 0;
      }
    }

    // Adjust available height for header repetition
    const availableForBody = repeatHeaderCount > 0 ? availableHeight - headerHeight : availableHeight;

    // Calculate full page height (for detecting over-tall rows)
    const fullPageHeight = state.contentBottom; // Assumes content starts at y=0

    // Handle pending partial row continuation
    if (pendingPartialRow !== null) {
      const rowIndex = pendingPartialRow.rowIndex;
      const fromLineByCell = pendingPartialRow.toLineByCell;

      const continuationPartialRow = computePartialRow(
        rowIndex,
        block.rows[rowIndex],
        measure,
        availableForBody,
        fromLineByCell,
      );

      const madeProgress = continuationPartialRow.toLineByCell.some(
        (toLine: number, idx: number) => toLine > (fromLineByCell[idx] || 0),
      );

      const hasRemainingLinesAfterContinuation = continuationPartialRow.toLineByCell.some(
        (toLine: number, idx: number) => {
          const totalLines = getCellTotalLines(measure.rows[rowIndex].cells[idx]);
          return toLine < totalLines;
        },
      );

      const hadRemainingLinesBefore = fromLineByCell.some((fromLine: number, idx: number) => {
        const totalLines = getCellTotalLines(measure.rows[rowIndex].cells[idx]);
        return fromLine < totalLines;
      });

      const fragmentHeight = continuationPartialRow.partialHeight + (repeatHeaderCount > 0 ? headerHeight : 0);

      // Only create a fragment if we made progress (rendered some lines)
      // Don't create empty fragments with just padding
      if (fragmentHeight > 0 && madeProgress) {
        // Apply tableIndent offset (negative values extend table into left margin, matching Word behavior)
        const tableIndent = getTableIndentWidth(block.attrs);
        const baseX = columnX(state.columnIndex);
        const baseWidth = Math.min(columnWidth, measure.totalWidth || columnWidth);
        const { x, width } = applyTableIndent(baseX, baseWidth, tableIndent);

        const fragment: TableFragment = {
          kind: 'table',
          blockId: block.id,
          fromRow: rowIndex,
          toRow: rowIndex + 1,
          x,
          y: state.cursorY,
          width,
          height: fragmentHeight,
          continuesFromPrev: true,
          continuesOnNext: hasRemainingLinesAfterContinuation || rowIndex + 1 < block.rows.length,
          repeatHeaderCount,
          partialRow: continuationPartialRow,
          metadata: generateFragmentMetadata(measure, rowIndex, rowIndex + 1, repeatHeaderCount),
        };

        state.page.fragments.push(fragment);
        state.cursorY += fragmentHeight;
      }

      const rowComplete = !hasRemainingLinesAfterContinuation;

      if (rowComplete) {
        currentRow = rowIndex + 1;
        pendingPartialRow = null;
      } else if (!madeProgress && hadRemainingLinesBefore) {
        // No progress made - need to advance to next page/column and retry
        state = advanceColumn(state);
        // Keep the same pendingPartialRow to retry on next page (no assignment needed)
      } else {
        // Made progress but row not complete - continue on SAME page
        // DO NOT call advanceColumn here! The cursor has already been advanced
        // by the fragment height above. Just update pendingPartialRow to track
        // remaining lines for the next iteration.
        pendingPartialRow = continuationPartialRow;
      }

      isTableContinuation = true;
      continue;
    }

    // Normal row processing
    const bodyStartRow = currentRow;
    const { endRow, partialRow } = findSplitPoint(block, measure, bodyStartRow, availableForBody, fullPageHeight);

    // If no rows fit and page has content, advance
    if (endRow === bodyStartRow && partialRow === null && state.page.fragments.length > 0) {
      state = advanceColumn(state);
      continue;
    }

    // If still no rows fit after retry, force split
    // This handles edge case where row is too tall to fit on empty page
    if (endRow === bodyStartRow && partialRow === null) {
      const forcedPartialRow = computePartialRow(bodyStartRow, block.rows[bodyStartRow], measure, availableForBody);
      const forcedEndRow = bodyStartRow + 1;
      const fragmentHeight = forcedPartialRow.partialHeight + (repeatHeaderCount > 0 ? headerHeight : 0);

      // Apply tableIndent offset (negative values extend table into left margin, matching Word behavior)
      const tableIndent = getTableIndentWidth(block.attrs);
      const baseX = columnX(state.columnIndex);
      const baseWidth = Math.min(columnWidth, measure.totalWidth || columnWidth);
      const { x, width } = applyTableIndent(baseX, baseWidth, tableIndent);

      const fragment: TableFragment = {
        kind: 'table',
        blockId: block.id,
        fromRow: bodyStartRow,
        toRow: forcedEndRow,
        x,
        y: state.cursorY,
        width,
        height: fragmentHeight,
        continuesFromPrev: isTableContinuation,
        continuesOnNext: !forcedPartialRow.isLastPart || forcedEndRow < block.rows.length,
        repeatHeaderCount,
        partialRow: forcedPartialRow,
        metadata: generateFragmentMetadata(measure, bodyStartRow, forcedEndRow, repeatHeaderCount),
      };

      state.page.fragments.push(fragment);
      state.cursorY += fragmentHeight;
      pendingPartialRow = forcedPartialRow;
      isTableContinuation = true;
      continue;
    }

    // Calculate fragment height
    let fragmentHeight: number;
    if (partialRow) {
      const fullRowsHeight = sumRowHeights(measure.rows, bodyStartRow, endRow - 1);
      fragmentHeight = fullRowsHeight + partialRow.partialHeight + (repeatHeaderCount > 0 ? headerHeight : 0);
    } else {
      fragmentHeight = calculateFragmentHeight(
        { fromRow: bodyStartRow, toRow: endRow, repeatHeaderCount },
        measure,
        headerCount,
      );
    }

    // Apply tableIndent offset (negative values extend table into left margin, matching Word behavior)
    const tableIndent = getTableIndentWidth(block.attrs);
    const baseX = columnX(state.columnIndex);
    const baseWidth = Math.min(columnWidth, measure.totalWidth || columnWidth);
    const { x, width } = applyTableIndent(baseX, baseWidth, tableIndent);

    const fragment: TableFragment = {
      kind: 'table',
      blockId: block.id,
      fromRow: bodyStartRow,
      toRow: endRow,
      x,
      y: state.cursorY,
      width,
      height: fragmentHeight,
      continuesFromPrev: isTableContinuation,
      continuesOnNext: endRow < block.rows.length || (partialRow ? !partialRow.isLastPart : false),
      repeatHeaderCount,
      partialRow: partialRow || undefined,
      metadata: generateFragmentMetadata(measure, bodyStartRow, endRow, repeatHeaderCount),
    };

    state.page.fragments.push(fragment);
    state.cursorY += fragmentHeight;

    // Handle partial row tracking
    if (partialRow && !partialRow.isLastPart) {
      pendingPartialRow = partialRow;
      currentRow = partialRow.rowIndex;
    } else {
      currentRow = endRow;
      pendingPartialRow = null;
    }

    isTableContinuation = true;
  }
}

/**
 * Create a table fragment for an anchored/floating table at its computed position.
 * Called by the layout engine after the float manager computes the table's position.
 */
export function createAnchoredTableFragment(
  block: TableBlock,
  measure: TableMeasure,
  x: number,
  y: number,
): TableFragment {
  const metadata: TableFragmentMetadata = {
    columnBoundaries: generateColumnBoundaries(measure),
    coordinateSystem: 'fragment',
  };

  return {
    kind: 'table',
    blockId: block.id,
    fromRow: 0,
    toRow: block.rows.length,
    x,
    y,
    width: measure.totalWidth ?? 0,
    height: measure.totalHeight ?? 0,
    metadata,
  };
}
