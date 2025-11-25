import type {
  TableBlock,
  TableMeasure,
  TableFragment,
  TableColumnBoundary,
  TableFragmentMetadata,
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

export function layoutTableBlock({
  block,
  measure,
  columnWidth,
  ensurePage,
  advanceColumn,
  columnX,
}: TableLayoutContext): void {
  let state = ensurePage();
  // Push to next column/page if not enough space and page already has content
  if (state.cursorY + measure.totalHeight > state.contentBottom && state.page.fragments.length > 0) {
    state = advanceColumn(state);
  }
  state = ensurePage();
  const height = Math.min(measure.totalHeight, state.contentBottom - state.cursorY);

  // Generate metadata for interactive table resizing
  const metadata: TableFragmentMetadata = {
    columnBoundaries: generateColumnBoundaries(measure),
    coordinateSystem: 'fragment',
    // rowBoundaries omitted - not needed for column resize, reduces DOM overhead
  };

  const fragment: TableFragment = {
    kind: 'table',
    blockId: block.id,
    fromRow: 0,
    toRow: block.rows.length,
    x: columnX(state.columnIndex),
    y: state.cursorY,
    width: Math.min(columnWidth, measure.totalWidth || columnWidth),
    height,
    metadata,
  };
  state.page.fragments.push(fragment);
  state.cursorY += height;
}
