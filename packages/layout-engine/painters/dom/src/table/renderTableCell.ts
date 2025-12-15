import type {
  CellBorders,
  DrawingBlock,
  Line,
  ParagraphBlock,
  ParagraphMeasure,
  ImageBlock,
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
  /** Starting line index for partial row rendering (inclusive) */
  fromLine?: number;
  /** Ending line index for partial row rendering (exclusive), -1 means render to end */
  toLine?: number;
};

/**
 * Result of rendering a table cell.
 */
export type TableCellRenderResult = {
  /** The cell container element (with borders, background, sizing, and content as child) */
  cellElement: HTMLElement;
};

/**
 * Renders a table cell as a DOM element.
 *
 * Creates a single cell element with content as a child:
 * - cellElement: Absolutely-positioned container with borders, background, sizing, padding,
 *   and content rendered inside. Cell uses overflow:hidden to clip any overflow.
 *
 * Handles:
 * - Cell borders (explicit or default)
 * - Background colors
 * - Vertical alignment (top, center, bottom)
 * - Cell padding (applied directly to cell element)
 * - Empty cells
 *
 * **Multi-Block Cell Rendering:**
 * - Iterates through all blocks in the cell (cell.blocks or cell.paragraph)
 * - Each block is rendered sequentially and stacked vertically
 * - Only paragraph blocks are currently rendered (other block types are ignored)
 *
 * **Backward Compatibility:**
 * - Supports legacy cell.paragraph field (single paragraph)
 * - Falls back to empty array if neither cell.blocks nor cell.paragraph is present
 * - Handles mismatches between blockMeasures and cellBlocks arrays using bounds checking
 *
 * **Empty Cell Handling:**
 * - Cells with no blocks render only the cell container (no content inside)
 * - Empty blocks arrays are safe (no content rendered)
 *
 * @param deps - All dependencies required for rendering
 * @returns Object containing cellElement (content is rendered inside as child)
 *
 * @example
 * ```typescript
 * const { cellElement } = renderTableCell({
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
 * ```
 */
export const renderTableCell = (deps: TableCellRenderDependencies): TableCellRenderResult => {
  const {
    doc,
    x,
    y,
    rowHeight,
    cellMeasure,
    cell,
    borders,
    useDefaultBorder,
    renderLine,
    context,
    applySdtDataset,
    fromLine,
    toLine,
  } = deps;

  const attrs = cell?.attrs;
  const padding = attrs?.padding || { top: 2, left: 4, right: 4, bottom: 2 };
  const paddingLeft = padding.left ?? 4;
  const paddingTop = padding.top ?? 2;
  const paddingRight = padding.right ?? 4;
  const paddingBottom = padding.bottom ?? 2;

  const cellEl = doc.createElement('div');
  cellEl.style.position = 'absolute';
  cellEl.style.left = `${x}px`;
  cellEl.style.top = `${y}px`;
  cellEl.style.width = `${cellMeasure.width}px`;
  cellEl.style.height = `${rowHeight}px`;
  cellEl.style.boxSizing = 'border-box';
  // Cell clips all overflow - no scrollbars, content just gets clipped at boundaries
  cellEl.style.overflow = 'hidden';
  // Apply padding directly to cell so content is positioned correctly
  cellEl.style.paddingLeft = `${paddingLeft}px`;
  cellEl.style.paddingTop = `${paddingTop}px`;
  cellEl.style.paddingRight = `${paddingRight}px`;
  cellEl.style.paddingBottom = `${paddingBottom}px`;

  if (borders) {
    applyCellBorders(cellEl, borders);
  } else if (useDefaultBorder) {
    cellEl.style.border = '1px solid rgba(0,0,0,0.6)';
  }

  if (cell?.attrs?.background) {
    cellEl.style.backgroundColor = cell.attrs.background;
  }

  // Support multi-block cells with backward compatibility
  const cellBlocks = cell?.blocks ?? (cell?.paragraph ? [cell.paragraph] : []);
  const blockMeasures = cellMeasure?.blocks ?? (cellMeasure?.paragraph ? [cellMeasure.paragraph] : []);

  try {
    console.log(
      '[DomPainter.renderTableCell] cell render input',
      JSON.stringify({
        cellId: cell?.id,
        blockKinds: cellBlocks.map((b) => b.kind),
        measureKinds: blockMeasures.map((m) => m.kind),
        width: cellMeasure?.width,
        height: cellMeasure?.height,
        rowHeight,
      }),
    );
  } catch {
    // ignore logging failures
  }

  if (cellBlocks.length > 0 && blockMeasures.length > 0) {
    // Content is a child of the cell, positioned relative to it
    // Cell's overflow:hidden handles clipping, no explicit width needed
    const content = doc.createElement('div');
    content.style.position = 'relative';
    content.style.width = '100%';
    content.style.height = '100%';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';

    if (cell?.attrs?.verticalAlign === 'center') {
      content.style.justifyContent = 'center';
    } else if (cell?.attrs?.verticalAlign === 'bottom') {
      content.style.justifyContent = 'flex-end';
    } else {
      content.style.justifyContent = 'flex-start';
    }

    // Append content to cell (content is now a child, not a sibling)
    cellEl.appendChild(content);

    // Calculate total lines across all blocks for proper global index mapping
    const blockLineCounts: number[] = [];
    for (let i = 0; i < Math.min(blockMeasures.length, cellBlocks.length); i++) {
      const bm = blockMeasures[i];
      if (bm.kind === 'paragraph') {
        blockLineCounts.push((bm as ParagraphMeasure).lines?.length || 0);
      } else {
        blockLineCounts.push(0);
      }
    }
    const totalLines = blockLineCounts.reduce((a, b) => a + b, 0);

    // Determine global line range to render
    const globalFromLine = fromLine ?? 0;
    const globalToLine = toLine === -1 || toLine === undefined ? totalLines : toLine;

    let cumulativeLineCount = 0; // Track cumulative line count across blocks
    for (let i = 0; i < Math.min(blockMeasures.length, cellBlocks.length); i++) {
      const blockMeasure = blockMeasures[i];
      const block = cellBlocks[i];

      if (blockMeasure.kind === 'image' && block?.kind === 'image') {
        console.log(
          '[DomPainter.renderTableCell] rendering image block in cell',
          JSON.stringify({
            cellId: cell?.id,
            blockId: block.id,
            width: blockMeasure.width,
            height: blockMeasure.height,
          }),
        );
        const imageWrapper = doc.createElement('div');
        imageWrapper.style.position = 'relative';
        imageWrapper.style.width = `${blockMeasure.width}px`;
        imageWrapper.style.height = `${blockMeasure.height}px`;
        imageWrapper.style.maxWidth = '100%';
        imageWrapper.style.boxSizing = 'border-box';
        applySdtDataset(imageWrapper, (block as ImageBlock).attrs?.sdt);

        const imgEl = doc.createElement('img');
        imgEl.classList.add('superdoc-table-image');
        if (block.src) {
          imgEl.src = block.src;
        }
        imgEl.alt = block.alt ?? '';
        imgEl.style.width = '100%';
        imgEl.style.height = '100%';
        imgEl.style.objectFit = block.objectFit ?? 'contain';
        imgEl.style.display = 'block';

        imageWrapper.appendChild(imgEl);
        content.appendChild(imageWrapper);
        continue;
      }

      if (blockMeasure.kind === 'drawing' && block?.kind === 'drawing') {
        console.log(
          '[DomPainter.renderTableCell] rendering drawing block in cell',
          JSON.stringify({
            cellId: cell?.id,
            blockId: block.id,
            drawingKind: block.drawingKind,
            width: blockMeasure.width,
            height: blockMeasure.height,
          }),
        );
        const drawingWrapper = doc.createElement('div');
        drawingWrapper.style.position = 'relative';
        drawingWrapper.style.width = `${blockMeasure.width}px`;
        drawingWrapper.style.height = `${blockMeasure.height}px`;
        drawingWrapper.style.maxWidth = '100%';
        drawingWrapper.style.boxSizing = 'border-box';
        applySdtDataset(drawingWrapper, (block as DrawingBlock).attrs as SdtMetadata | undefined);

        const drawingInner = doc.createElement('div');
        drawingInner.classList.add('superdoc-table-drawing');
        drawingInner.style.width = '100%';
        drawingInner.style.height = '100%';
        drawingInner.style.display = 'flex';
        drawingInner.style.alignItems = 'center';
        drawingInner.style.justifyContent = 'center';
        drawingInner.style.overflow = 'hidden';

        if (block.drawingKind === 'image' && 'src' in block && block.src) {
          const img = doc.createElement('img');
          img.classList.add('superdoc-drawing-image');
          img.src = block.src;
          img.alt = block.alt ?? '';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = block.objectFit ?? 'contain';
          drawingInner.appendChild(img);
        } else {
          const placeholder = doc.createElement('div');
          placeholder.style.width = '100%';
          placeholder.style.height = '100%';
          placeholder.style.background =
            'repeating-linear-gradient(45deg, rgba(15,23,42,0.1), rgba(15,23,42,0.1) 6px, rgba(15,23,42,0.2) 6px, rgba(15,23,42,0.2) 12px)';
          placeholder.style.border = '1px dashed rgba(15, 23, 42, 0.3)';
          drawingInner.appendChild(placeholder);
        }

        drawingWrapper.appendChild(drawingInner);
        content.appendChild(drawingWrapper);
        continue;
      }

      if (blockMeasure.kind === 'paragraph' && block?.kind === 'paragraph') {
        try {
          const runKinds = (block.runs ?? []).map((r) => (r as { kind?: string }).kind ?? 'text');
          const imageRuns = (block.runs ?? [])
            .filter((r) => (r as { kind?: string }).kind === 'image')
            .map((r) => ({ src: (r as { src?: string }).src }));
          console.log(
            '[DomPainter.renderTableCell] rendering paragraph block in cell',
            JSON.stringify({
              cellId: cell?.id,
              blockId: block.id,
              runKinds,
              imageRuns,
            }),
          );
        } catch {
          // ignore
        }
        const lines = (blockMeasure as ParagraphMeasure).lines;
        const blockLineCount = lines?.length || 0;

        // Calculate the global line indices for this block
        const blockStartGlobal = cumulativeLineCount;
        const blockEndGlobal = cumulativeLineCount + blockLineCount;

        // Skip blocks entirely before/after the global range
        if (blockEndGlobal <= globalFromLine) {
          cumulativeLineCount += blockLineCount;
          continue;
        }
        if (blockStartGlobal >= globalToLine) {
          cumulativeLineCount += blockLineCount;
          continue;
        }

        // Calculate local line indices within this block
        const localStartLine = Math.max(0, globalFromLine - blockStartGlobal);
        const localEndLine = Math.min(blockLineCount, globalToLine - blockStartGlobal);

        // Create wrapper for this paragraph's SDT metadata
        // Use absolute positioning within the content container to stack blocks vertically
        const paraWrapper = doc.createElement('div');
        paraWrapper.style.position = 'relative';
        paraWrapper.style.left = '0';
        paraWrapper.style.width = '100%';
        applySdtDataset(paraWrapper, block.attrs?.sdt);

        // Calculate height of rendered content for proper block accumulation
        let renderedHeight = 0;

        // Render only the lines in the local range
        for (let lineIdx = localStartLine; lineIdx < localEndLine && lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx];
          const lineEl = renderLine(block as ParagraphBlock, line, { ...context, section: 'body' });
          paraWrapper.appendChild(lineEl);
          renderedHeight += line.lineHeight;
        }

        // If we rendered the entire paragraph, use measured totalHeight to keep layout aligned with measurement
        const renderedEntireBlock = localStartLine === 0 && localEndLine >= blockLineCount;
        if (renderedEntireBlock && blockMeasure.totalHeight && blockMeasure.totalHeight > renderedHeight) {
          renderedHeight = blockMeasure.totalHeight;
        }

        content.appendChild(paraWrapper);

        if (renderedHeight > 0) {
          paraWrapper.style.height = `${renderedHeight}px`;
        }

        // Apply paragraph spacing.after as margin-bottom for all paragraphs.
        // Word applies spacing.after even to the last paragraph in a cell, creating space at the bottom.
        if (renderedEntireBlock) {
          const spacingAfter = (block as ParagraphBlock).attrs?.spacing?.after;
          if (typeof spacingAfter === 'number' && spacingAfter > 0) {
            paraWrapper.style.marginBottom = `${spacingAfter}px`;
          }
        }

        cumulativeLineCount += blockLineCount;
      } else {
        // Non-paragraph block - skip for now
        cumulativeLineCount += 0;
      }
      // TODO: Handle other block types (list, image) if needed
    }
  }

  return { cellElement: cellEl };
};
