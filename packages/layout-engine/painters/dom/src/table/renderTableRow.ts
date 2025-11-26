import type { Line, ParagraphBlock, SdtMetadata, TableBlock, TableBorders, TableMeasure } from '@superdoc/contracts';
import { renderTableCell } from './renderTableCell.js';
import { resolveTableCellBorders } from './border-utils.js';
import type { FragmentRenderContext } from '../renderer.js';

type TableRowMeasure = TableMeasure['rows'][number];
type TableRow = TableBlock['rows'][number];

/**
 * Dependencies required for rendering a table row.
 *
 * Contains all information needed to render cells in a table row, including
 * positioning, measurements, border resolution, and rendering functions.
 */
type TableRowRenderDependencies = {
  /** Document object for creating DOM elements */
  doc: Document;
  /** Container element to append cell elements to */
  container: HTMLElement;
  /** Zero-based index of this row */
  rowIndex: number;
  /** Vertical position (top edge) in pixels */
  y: number;
  /** Measurement data for this row (height, cell measurements) */
  rowMeasure: TableRowMeasure;
  /** Row data (cells, attributes), or undefined for empty rows */
  row?: TableRow;
  /** Total number of rows in the table (for border resolution) */
  totalRows: number;
  /** Table-level borders (for resolving cell borders) */
  tableBorders?: TableBorders;
  /** Column widths array for calculating x positions from gridColumnStart */
  columnWidths: number[];
  /** All row heights for calculating rowspan cell heights */
  allRowHeights: number[];
  /** Rendering context */
  context: FragmentRenderContext;
  /** Function to render a line of paragraph content */
  renderLine: (block: ParagraphBlock, line: Line, context: FragmentRenderContext) => HTMLElement;
  /** Function to apply SDT metadata as data attributes */
  applySdtDataset: (el: HTMLElement | null, metadata?: SdtMetadata | null) => void;
};

/**
 * Renders all cells in a table row.
 *
 * Iterates through cells in the row, resolving borders based on cell position,
 * and rendering each cell with its content. Cells are positioned horizontally
 * by accumulating their widths.
 *
 * Border resolution logic:
 * - Cells with explicit borders use those borders
 * - Otherwise, cells use position-based borders from table borders:
 *   - Edge cells use outer table borders
 *   - Interior cells use inside borders (insideH, insideV)
 * - If no table borders exist, default borders are applied
 *
 * @param deps - All dependencies required for rendering
 *
 * @example
 * ```typescript
 * renderTableRow({
 *   doc: document,
 *   container: tableContainer,
 *   rowIndex: 0,
 *   y: 0,
 *   rowMeasure,
 *   row,
 *   totalRows: 3,
 *   tableBorders,
 *   context,
 *   renderLine,
 *   applySdtDataset
 * });
 * // Appends all cell elements to container
 * ```
 */
export const renderTableRow = (deps: TableRowRenderDependencies): void => {
  const {
    doc,
    container,
    rowIndex,
    y,
    rowMeasure,
    row,
    totalRows,
    tableBorders,
    columnWidths,
    allRowHeights,
    context,
    renderLine,
    applySdtDataset,
  } = deps;

  /**
   * Calculates the horizontal position (x-coordinate) for a cell based on its grid column index.
   *
   * Sums the widths of all columns preceding the given column index to determine
   * the left edge position of a cell. This handles both normal cells and cells
   * offset by rowspans from previous rows.
   *
   * **Bounds Safety:**
   * Loop terminates at the minimum of `gridColumnStart` and `columnWidths.length`
   * to prevent out-of-bounds array access.
   *
   * @param gridColumnStart - Zero-based column index in the table grid
   * @returns Horizontal position in pixels from the left edge of the table
   *
   * @example
   * ```typescript
   * // columnWidths = [100, 150, 200]
   * calculateXPosition(0) // Returns: 0 (first column)
   * calculateXPosition(1) // Returns: 100 (after first column)
   * calculateXPosition(2) // Returns: 250 (after first two columns)
   * calculateXPosition(10) // Returns: 450 (safe - stops at array length)
   * ```
   */
  const calculateXPosition = (gridColumnStart: number): number => {
    let x = 0;
    for (let i = 0; i < gridColumnStart && i < columnWidths.length; i++) {
      x += columnWidths[i];
    }
    return x;
  };

  /**
   * Calculates the total height for a cell that spans multiple rows (rowspan).
   *
   * Sums the heights of consecutive rows starting from `startRowIndex` up to
   * the number of rows specified by `rowSpan`. This determines the vertical
   * size needed to render a cell that merges multiple rows.
   *
   * **Bounds Safety:**
   * Loop checks both rowSpan count and array bounds to prevent accessing
   * non-existent rows.
   *
   * @param startRowIndex - Zero-based index of the first row in the span
   * @param rowSpan - Number of rows the cell spans (typically >= 1)
   * @returns Total height in pixels for the cell
   *
   * @example
   * ```typescript
   * // allRowHeights = [50, 60, 70, 80]
   * calculateRowspanHeight(0, 1) // Returns: 50 (single row)
   * calculateRowspanHeight(0, 2) // Returns: 110 (rows 0 and 1)
   * calculateRowspanHeight(1, 3) // Returns: 210 (rows 1, 2, and 3)
   * calculateRowspanHeight(3, 5) // Returns: 80 (safe - only row 3 exists)
   * ```
   */
  const calculateRowspanHeight = (startRowIndex: number, rowSpan: number): number => {
    let totalHeight = 0;
    for (let i = 0; i < rowSpan && startRowIndex + i < allRowHeights.length; i++) {
      totalHeight += allRowHeights[startRowIndex + i];
    }
    return totalHeight;
  };

  for (let cellIndex = 0; cellIndex < rowMeasure.cells.length; cellIndex += 1) {
    const cellMeasure = rowMeasure.cells[cellIndex];
    const cell = row?.cells?.[cellIndex];

    // Calculate x position from gridColumnStart if available, otherwise fallback
    const x =
      cellMeasure.gridColumnStart != null
        ? calculateXPosition(cellMeasure.gridColumnStart)
        : cellIndex === 0
          ? 0
          : calculateXPosition(cellIndex);

    // Check if cell has any border attribute at all (even if empty - empty means "no borders")
    const cellBordersAttr = cell?.attrs?.borders;
    const hasBordersAttribute = cellBordersAttr !== undefined;

    // Check if cell has meaningful explicit borders (with at least one side defined)
    const hasExplicitBorders =
      hasBordersAttribute &&
      cellBordersAttr &&
      (cellBordersAttr.top !== undefined ||
        cellBordersAttr.right !== undefined ||
        cellBordersAttr.bottom !== undefined ||
        cellBordersAttr.left !== undefined);

    // Use gridColumnStart for border resolution (not cellIndex) since cells may be offset
    // by rowspans from previous rows. Similarly, use grid column count, not cell count.
    const gridColIndex = cellMeasure.gridColumnStart ?? cellIndex;
    const totalCols = columnWidths.length;

    // Border resolution priority:
    // 1. Cell has explicit borders with sides defined → use those
    // 2. Cell has borders attribute but empty → no borders (intentionally borderless)
    // 3. Table has borders → resolve from table borders
    // 4. Neither → no borders (we never use default gray borders anymore)
    let resolvedBorders;
    if (hasExplicitBorders) {
      resolvedBorders = cellBordersAttr;
    } else if (hasBordersAttribute) {
      // Cell explicitly has borders={} meaning "no borders"
      resolvedBorders = undefined;
    } else if (tableBorders) {
      resolvedBorders = resolveTableCellBorders(tableBorders, rowIndex, gridColIndex, totalRows, totalCols);
    } else {
      resolvedBorders = undefined;
    }

    // Calculate cell height - use rowspan height if cell spans multiple rows
    const rowSpan = cellMeasure.rowSpan ?? 1;
    const cellHeight = rowSpan > 1 ? calculateRowspanHeight(rowIndex, rowSpan) : rowMeasure.height;

    // Never use default borders - cells are either explicitly styled or borderless
    // This prevents gray borders on cells with borders={} (intentionally borderless)
    const { cellElement, contentElement } = renderTableCell({
      doc,
      x,
      y,
      rowHeight: cellHeight,
      cellMeasure,
      cell,
      borders: resolvedBorders,
      useDefaultBorder: false,
      renderLine,
      context,
      applySdtDataset,
    });

    container.appendChild(cellElement);
    if (contentElement) {
      container.appendChild(contentElement);
    }
  }
};
