import type {
  CellBorders,
  Line,
  ParagraphBlock,
  ParagraphMeasure,
  SdtMetadata,
  TableBlock,
  TableMeasure,
} from '@superdoc/contracts';
import { applyCellBorders } from './border-utils.js';
import type { FragmentRenderContext } from '../renderer.js';

type TableRowMeasure = TableMeasure['rows'][number];

/**
 * Dependencies required for rendering a table cell.
 *
 * Contains positioning, sizing, content, and rendering functions needed to
 * create a table cell DOM element with its content.
 */
type TableCellRenderDependencies = {
  /** Document object for creating DOM elements */
  doc: Document;
  /** Horizontal position (left edge) in pixels */
  x: number;
  /** Vertical position (top edge) in pixels */
  y: number;
  /** Height of the row containing this cell */
  rowHeight: number;
  /** Measurement data for this cell (width, paragraph layout) */
  cellMeasure: TableRowMeasure['cells'][number];
  /** Cell data (content, attributes), or undefined for empty cells */
  cell?: TableBlock['rows'][number]['cells'][number];
  /** Resolved borders for this cell */
  borders?: CellBorders;
  /** Whether to apply default border if no borders specified */
  useDefaultBorder?: boolean;
  /** Function to render a line of paragraph content */
  renderLine: (block: ParagraphBlock, line: Line, context: FragmentRenderContext) => HTMLElement;
  /** Rendering context */
  context: FragmentRenderContext;
  /** Function to apply SDT metadata as data attributes */
  applySdtDataset: (el: HTMLElement | null, metadata?: SdtMetadata | null) => void;
};

/**
 * Result of rendering a table cell.
 */
export type TableCellRenderResult = {
  /** The cell container element (with borders, background, sizing) */
  cellElement: HTMLElement;
  /** The content element (paragraph lines), or undefined if cell is empty */
  contentElement?: HTMLElement;
};

/**
 * Renders a table cell as DOM elements.
 *
 * Creates two elements:
 * 1. cellElement: Absolutely-positioned container with borders, background, and sizing
 * 2. contentElement: Absolutely-positioned content container with paragraph lines and padding
 *
 * Handles:
 * - Cell borders (explicit or default)
 * - Background colors
 * - Vertical alignment (top, center, bottom)
 * - Cell padding
 * - Empty cells
 *
 * **Multi-Block Cell Rendering:**
 * - Iterates through all blocks in the cell (cell.blocks or cell.paragraph)
 * - Each block is rendered sequentially and stacked vertically
 * - Block positions are accumulated using absolute positioning within the content container
 * - Only paragraph blocks are currently rendered (other block types are ignored)
 *
 * **Backward Compatibility:**
 * - Supports legacy cell.paragraph field (single paragraph)
 * - Falls back to empty array if neither cell.blocks nor cell.paragraph is present
 * - Handles mismatches between blockMeasures and cellBlocks arrays using bounds checking
 *
 * **Empty Cell Handling:**
 * - Cells with no blocks render only the cellElement (no contentElement)
 * - Empty blocks arrays are safe (no content rendered)
 *
 * @param deps - All dependencies required for rendering
 * @returns Object containing cellElement and optional contentElement
 *
 * @example
 * ```typescript
 * const { cellElement, contentElement } = renderTableCell({
 *   doc: document,
 *   x: 100,
 *   y: 50,
 *   rowHeight: 30,
 *   cellMeasure,
 *   cell,
 *   borders,
 *   useDefaultBorder: false,
 *   renderLine,
 *   context,
 *   applySdtDataset
 * });
 * container.appendChild(cellElement);
 * if (contentElement) container.appendChild(contentElement);
 * ```
 */
export const renderTableCell = (deps: TableCellRenderDependencies): TableCellRenderResult => {
  const { doc, x, y, rowHeight, cellMeasure, cell, borders, useDefaultBorder, renderLine, context, applySdtDataset } =
    deps;

  const cellEl = doc.createElement('div');
  cellEl.style.position = 'absolute';
  cellEl.style.left = `${x}px`;
  cellEl.style.top = `${y}px`;
  cellEl.style.width = `${cellMeasure.width}px`;
  cellEl.style.height = `${rowHeight}px`;
  cellEl.style.boxSizing = 'border-box';

  if (borders) {
    applyCellBorders(cellEl, borders);
  } else if (useDefaultBorder) {
    cellEl.style.border = '1px solid rgba(0,0,0,0.6)';
  }

  if (cell?.attrs?.background) {
    cellEl.style.backgroundColor = cell.attrs.background;
  }

  if (cell?.attrs?.verticalAlign) {
    cellEl.style.display = 'flex';
    cellEl.style.flexDirection = 'column';
    cellEl.style.justifyContent =
      cell.attrs.verticalAlign === 'top' ? 'flex-start' : cell.attrs.verticalAlign === 'bottom' ? 'flex-end' : 'center';
  }

  let contentElement: HTMLElement | undefined;

  const attrs = cell?.attrs;
  const padding = attrs?.padding || { top: 2, left: 4, right: 4, bottom: 2 };
  const paddingLeft = padding.left ?? 4;
  const paddingTop = padding.top ?? 2;
  const paddingRight = padding.right ?? 4;

  // Support multi-block cells with backward compatibility
  const cellBlocks = cell?.blocks ?? (cell?.paragraph ? [cell.paragraph] : []);
  const blockMeasures = cellMeasure.blocks ?? (cellMeasure.paragraph ? [cellMeasure.paragraph] : []);

  if (cellBlocks.length > 0 && blockMeasures.length > 0) {
    const content = doc.createElement('div');
    content.style.position = 'absolute';
    content.style.left = `${x + paddingLeft}px`;
    content.style.top = `${y + paddingTop}px`;
    content.style.width = `${Math.max(0, cellMeasure.width - paddingLeft - paddingRight)}px`;

    let blockY = 0;
    for (let i = 0; i < Math.min(blockMeasures.length, cellBlocks.length); i++) {
      const blockMeasure = blockMeasures[i];
      const block = cellBlocks[i];

      if (blockMeasure.kind === 'paragraph' && block?.kind === 'paragraph') {
        // Create wrapper for this paragraph's SDT metadata
        // Use absolute positioning within the content container to stack blocks vertically
        const paraWrapper = doc.createElement('div');
        paraWrapper.style.position = 'absolute';
        paraWrapper.style.top = `${blockY}px`;
        paraWrapper.style.left = '0';
        paraWrapper.style.width = '100%';
        applySdtDataset(paraWrapper, block.attrs?.sdt);

        const lines = (blockMeasure as ParagraphMeasure).lines;
        lines.forEach((line) => {
          const lineEl = renderLine(block as ParagraphBlock, line, { ...context, section: 'body' });
          paraWrapper.appendChild(lineEl);
        });

        content.appendChild(paraWrapper);
        blockY += blockMeasure.totalHeight;
      }
      // TODO: Handle other block types (list, image) if needed
    }

    contentElement = content;
  }

  return { cellElement: cellEl, contentElement };
};
