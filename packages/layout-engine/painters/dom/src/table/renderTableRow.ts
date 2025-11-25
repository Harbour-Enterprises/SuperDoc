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
    context,
    renderLine,
    applySdtDataset,
  } = deps;

  let x = 0;
  for (let cellIndex = 0; cellIndex < rowMeasure.cells.length; cellIndex += 1) {
    const cellMeasure = rowMeasure.cells[cellIndex];
    const cell = row?.cells?.[cellIndex];
    const hasExplicitBorders = Boolean(cell?.attrs?.borders);
    const resolvedBorders = hasExplicitBorders
      ? cell?.attrs?.borders
      : tableBorders
        ? resolveTableCellBorders(tableBorders, rowIndex, cellIndex, totalRows, rowMeasure.cells.length)
        : undefined;

    const { cellElement, contentElement } = renderTableCell({
      doc,
      x,
      y,
      rowHeight: rowMeasure.height,
      cellMeasure,
      cell,
      borders: resolvedBorders,
      useDefaultBorder: !hasExplicitBorders && !tableBorders,
      renderLine,
      context,
      applySdtDataset,
    });

    container.appendChild(cellElement);
    if (contentElement) {
      container.appendChild(contentElement);
    }

    x += cellMeasure.width;
  }
};
