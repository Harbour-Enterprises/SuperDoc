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
import { toCssFontFamily } from '@superdoc/font-utils';

/**
 * Default gap between list marker and text content in pixels.
 * This is applied when a gutter width is not explicitly provided in the marker layout.
 * The 8px default matches Microsoft Word's standard list marker spacing.
 */
const LIST_MARKER_GAP = 8;

/**
 * Word layout information for paragraph list markers.
 * Contains positioning, styling, and rendering details for list markers (bullets/numbers).
 */
type WordLayoutMarker = {
  /** Text content of the marker (e.g., "1.", "a)", "•") */
  markerText?: string;
  /** Width of the marker box in pixels */
  markerBoxWidthPx?: number;
  /** Width of the gutter (space between marker and text) in pixels */
  gutterWidthPx?: number;
  /** Horizontal justification of marker within its box */
  justification?: 'left' | 'center' | 'right';
  /** Absolute x position of the marker start */
  markerX?: number;
  /** Run properties for marker styling */
  run: {
    /** Font family for the marker */
    fontFamily?: string;
    /** Font size in pixels */
    fontSize?: number;
    /** Whether marker is bold */
    bold?: boolean;
    /** Whether marker is italic */
    italic?: boolean;
    /** Text color as hex string */
    color?: string;
    /** Letter spacing in pixels */
    letterSpacing?: number;
  };
};

/**
 * Word layout information for a paragraph.
 * Computed by the word-layout engine to provide accurate list marker positioning
 * and indent calculations matching Microsoft Word's behavior.
 */
type WordLayoutInfo = {
  /** Marker layout information if this is a list paragraph */
  marker?: WordLayoutMarker;
  /** Left indent in pixels */
  indentLeftPx?: number;
  /** Whether first-line indent mode is enabled */
  firstLineIndentMode?: boolean;
};

type TableRowMeasure = TableMeasure['rows'][number];

/**
 * Parameters for rendering a list marker element.
 */
type MarkerRenderParams = {
  /** Document object for creating DOM elements */
  doc: Document;
  /** Line element to which the marker will be attached */
  lineEl: HTMLElement;
  /** Marker layout information from word-layout engine */
  markerLayout: WordLayoutMarker;
  /** Marker measurement data from measurement stage */
  markerMeasure: ParagraphMeasure['marker'];
  /** Left indent in pixels */
  indentLeftPx: number;
};

/**
 * Renders a list marker (bullet or number) for a paragraph line.
 *
 * This function creates a positioned marker element and wraps the line in a container
 * to support absolute positioning of the marker relative to the text.
 *
 * **Marker Positioning Logic:**
 * - `markerStartPos`: The x-coordinate where text content begins (after the marker + gutter)
 * - `markerLeftPos`: The x-coordinate where the marker box starts (markerStartPos - markerBoxWidth)
 * - The marker is absolutely positioned within the line container
 * - Text gets left padding equal to markerStartPos to align with the marker end
 *
 * **Justification Handling:**
 * - `left`: Marker box starts at indentLeftPx, text follows after box + gutter
 * - `right`: Uses markerX from layout engine, marker right-aligns within its box
 * - `center`: Uses markerX from layout engine, marker center-aligns within its box
 *
 * @param params - Marker rendering parameters
 * @returns Container element with marker and line as children
 */
function renderListMarker(params: MarkerRenderParams): HTMLElement {
  const { doc, lineEl, markerLayout, markerMeasure, indentLeftPx } = params;

  const markerJustification = markerLayout?.justification ?? 'left';

  // Extract marker box width with fallback chain: layout -> measure -> 0
  const markerBoxWidth =
    (typeof markerLayout?.markerBoxWidthPx === 'number' ? markerLayout.markerBoxWidthPx : undefined) ??
    markerMeasure?.markerWidth ??
    0;

  // Extract gutter width with fallback chain: layout -> measure -> default gap
  const gutter =
    (typeof markerLayout?.gutterWidthPx === 'number' ? markerLayout.gutterWidthPx : undefined) ??
    markerMeasure?.gutterWidth ??
    LIST_MARKER_GAP;

  // Calculate marker start position based on justification
  const markerStartPos =
    markerJustification === 'left'
      ? indentLeftPx
      : ((typeof markerLayout?.markerX === 'number' ? markerLayout.markerX : undefined) ?? indentLeftPx);

  // Marker left position is marker start minus the width of the marker box
  const markerLeftPos = markerStartPos - markerBoxWidth;

  // Create container to hold both marker and line
  const lineContainer = doc.createElement('div');
  lineContainer.style.position = 'relative';
  lineContainer.style.width = '100%';

  // Create marker element with styling from layout engine
  const markerEl = doc.createElement('span');
  markerEl.classList.add('superdoc-paragraph-marker');
  markerEl.textContent = markerLayout?.markerText ?? '';
  markerEl.style.display = 'inline-block';
  markerEl.style.fontFamily = toCssFontFamily(markerLayout?.run?.fontFamily) ?? markerLayout?.run?.fontFamily ?? '';
  if (markerLayout?.run?.fontSize != null) {
    markerEl.style.fontSize = `${markerLayout.run.fontSize}px`;
  }
  markerEl.style.fontWeight = markerLayout?.run?.bold ? 'bold' : '';
  markerEl.style.fontStyle = markerLayout?.run?.italic ? 'italic' : '';
  if (markerLayout?.run?.color) {
    markerEl.style.color = markerLayout.run.color;
  }
  if (markerLayout?.run?.letterSpacing != null) {
    markerEl.style.letterSpacing = `${markerLayout.run.letterSpacing}px`;
  }

  // Position marker absolutely within the container
  markerEl.style.position = 'absolute';
  markerEl.style.left = `${markerLeftPos}px`;
  markerEl.style.width = `${markerBoxWidth}px`;
  markerEl.style.textAlign = markerJustification;
  markerEl.style.paddingRight = `${gutter}px`;

  // Align text start to the marker start position (gutter spacing comes from marker padding)
  lineEl.style.paddingLeft = `${markerStartPos}px`;

  lineContainer.appendChild(markerEl);
  lineContainer.appendChild(lineEl);

  return lineContainer;
}

/**
 * Apply paragraph-level visual styling such as borders and shading.
 * Borders are set per side with sensible defaults and clamping.
 */
function applyParagraphBordersAndShading(paraWrapper: HTMLElement, block: ParagraphBlock): void {
  const borders = block.attrs?.borders;

  if (borders) {
    paraWrapper.style.boxSizing = 'border-box';

    const sideStyles: Record<'top' | 'bottom' | 'left' | 'right', { width: string; style: string; color: string }> = {
      top: { width: 'border-top-width', style: 'border-top-style', color: 'border-top-color' },
      bottom: { width: 'border-bottom-width', style: 'border-bottom-style', color: 'border-bottom-color' },
      left: { width: 'border-left-width', style: 'border-left-style', color: 'border-left-color' },
      right: { width: 'border-right-width', style: 'border-right-style', color: 'border-right-color' },
    };

    (['top', 'bottom', 'left', 'right'] as const).forEach((side) => {
      const border = borders[side];
      if (!border) return;

      const styleValue = border.style ?? 'solid';
      let widthValue = typeof border.width === 'number' ? Math.max(0, border.width) : 1; // default width when undefined

      // Border style none should render as zero width
      if (styleValue === 'none') {
        widthValue = 0;
      }

      const cssKeys = sideStyles[side];
      paraWrapper.style.setProperty(cssKeys.style, styleValue);
      paraWrapper.style.setProperty(cssKeys.width, `${widthValue}px`);
      if (border.color) {
        paraWrapper.style.setProperty(cssKeys.color, border.color);
      }
    });
  }

  const shadingFill = block.attrs?.shading?.fill;
  if (shadingFill) {
    paraWrapper.style.backgroundColor = shadingFill;
  }
}

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
  renderLine: (
    block: ParagraphBlock,
    line: Line,
    context: FragmentRenderContext,
    lineIndex: number,
    isLastLine: boolean,
  ) => HTMLElement;
  /**
   * Optional callback function to render drawing content (vectorShapes, shapeGroups).
   * If provided, this callback is used to render DrawingBlocks with drawingKind of 'vectorShape' or 'shapeGroup'.
   * The callback receives a DrawingBlock and must return an HTMLElement.
   * The returned element will have width: 100% and height: 100% styles applied automatically.
   * If undefined, a placeholder element with diagonal stripes pattern is rendered instead.
   */
  renderDrawingContent?: (block: DrawingBlock) => HTMLElement;
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
 *   renderDrawingContent: (block) => {
 *     // Custom drawing renderer for vectorShapes and shapeGroups
 *     const el = document.createElement('div');
 *     // Render drawing content...
 *     return el;
 *   },
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
    renderDrawingContent,
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
        } else if (renderDrawingContent) {
          // Use the callback for other drawing types (vectorShape, shapeGroup, etc.)
          const drawingContent = renderDrawingContent(block as DrawingBlock);
          drawingContent.style.width = '100%';
          drawingContent.style.height = '100%';
          drawingInner.appendChild(drawingContent);
        } else {
          // Fallback placeholder when no rendering callback is provided
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
        const paragraphMeasure = blockMeasure as ParagraphMeasure;
        const lines = paragraphMeasure.lines;
        const blockLineCount = lines?.length || 0;

        /**
         * Extract Word layout information from paragraph attributes.
         * This contains computed marker positioning and indent details from the word-layout engine.
         * The wordLayout is pre-computed during paragraph attribute processing and provides
         * accurate positioning for list markers matching Microsoft Word's behavior.
         */
        const wordLayout = (block.attrs?.wordLayout ?? null) as WordLayoutInfo | null;

        /**
         * Marker layout contains the rendering details for list markers (bullets/numbers).
         * This includes the marker text, positioning, justification, and styling.
         */
        const markerLayout = wordLayout?.marker;

        /**
         * Marker measurement data from the measurement stage.
         * Contains computed dimensions (width, gutter) for the marker.
         */
        const markerMeasure = paragraphMeasure.marker;
        const indentLeftPx =
          markerMeasure?.indentLeft ??
          wordLayout?.indentLeftPx ??
          (block.attrs?.indent && typeof block.attrs.indent.left === 'number' ? block.attrs.indent.left : 0);

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
        applyParagraphBordersAndShading(paraWrapper, block as ParagraphBlock);

        // Calculate height of rendered content for proper block accumulation
        let renderedHeight = 0;

        /**
         * Render lines for this paragraph block.
         * Lines are rendered within the local range (localStartLine to localEndLine).
         * List markers are only rendered on the first line if we're rendering from the start.
         */
        for (let lineIdx = localStartLine; lineIdx < localEndLine && lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx];
          const isLastLine = lineIdx === lines.length - 1;

          /**
           * Render line without extra paragraph padding to enable explicit marker/text offset control.
           * This mirrors the main renderer behavior where list markers clear padding/textIndent.
           */
          const lineEl = renderLine(
            block as ParagraphBlock,
            line,
            { ...context, section: 'body' },
            lineIdx,
            isLastLine,
          );
          lineEl.style.paddingLeft = '';
          lineEl.style.paddingRight = '';
          lineEl.style.textIndent = '';

          /**
           * Determine if we should render a list marker for this line.
           * Markers are only rendered on the first line of a paragraph, and only if:
           * - We have marker layout information from word-layout engine
           * - We have marker measurement data
           * - This is the first line (lineIdx === 0)
           * - We're rendering from the start of the paragraph (localStartLine === 0)
           * - The marker has a non-zero width
           */
          const shouldRenderMarker =
            markerLayout && markerMeasure && lineIdx === 0 && localStartLine === 0 && markerMeasure.markerWidth > 0;

          if (shouldRenderMarker) {
            /**
             * Render the list marker using the extracted helper function.
             * This creates a container with the marker positioned absolutely
             * and the line content positioned with appropriate padding.
             */
            const lineContainer = renderListMarker({
              doc,
              lineEl,
              markerLayout,
              markerMeasure,
              indentLeftPx,
            });
            paraWrapper.appendChild(lineContainer);
          } else {
            /**
             * For lines without markers, apply appropriate indentation:
             * - For list paragraphs: apply indent padding for continuation lines
             * - For non-list paragraphs: preserve the paragraph's own indent styling
             */
            if (markerLayout && indentLeftPx) {
              lineEl.style.paddingLeft = `${indentLeftPx}px`;
            } else {
              // Preserve non-list paragraph indentation that was cleared above
              /**
               * SD-1295: Hanging indent implementation for table cells.
               *
               * **Mathematical Model:**
               * The hanging indent effect is achieved through a combination of paddingLeft and textIndent:
               * - `firstLineOffset = firstLine - hanging`
               * - This offset can be positive (indent first line further right) or negative (outdent first line to the left)
               *
               * **CSS Application Pattern:**
               * - **First line:**
               *   - `paddingLeft = left` (base left indent)
               *   - `textIndent = firstLineOffset` (additional first-line adjustment)
               *   - Combined effect: text starts at `left + firstLineOffset` pixels from cell edge
               *
               * - **Body lines (continuation lines):**
               *   - `paddingLeft = left + hanging` (when hanging > 0)
               *   - `textIndent` not set (defaults to 0)
               *   - Combined effect: text starts at `left + hanging` pixels from cell edge
               *   - This indents body lines further right, creating the "hanging" visual effect
               *
               * **Edge Cases:**
               * - Negative hanging: Intentionally ignored for body lines (no effect, body uses left indent only)
               * - Negative left indent: Clamped to 0 by CSS (browsers don't support negative padding)
               * - Zero values: No style applied (avoids unnecessary CSS)
               * - Partial rendering: `isFirstLine` checks both line index and rendering start position
               *   to ensure correct treatment when rendering starts mid-paragraph
               *
               * **Examples:**
               * 1. Classic hanging indent (bibliography style):
               *    - left: 20, hanging: 30, firstLine: 0
               *    - First line: paddingLeft=20px, textIndent=-30px → starts at -10px (outdented)
               *    - Body lines: paddingLeft=50px → starts at 50px (indented)
               *
               * 2. First-line indent with hanging:
               *    - left: 20, hanging: 30, firstLine: 10
               *    - First line: paddingLeft=20px, textIndent=-20px → starts at 0px
               *    - Body lines: paddingLeft=50px → starts at 50px
               *
               * 3. Simple first-line indent (no hanging):
               *    - left: 20, hanging: 0, firstLine: 15
               *    - First line: paddingLeft=20px, textIndent=15px → starts at 35px
               *    - Body lines: paddingLeft=20px → starts at 20px
               */
              const indent = block.attrs?.indent;
              if (indent) {
                const leftIndent: number = typeof indent.left === 'number' ? indent.left : 0;
                const hanging: number = typeof indent.hanging === 'number' ? indent.hanging : 0;
                const firstLine: number = typeof indent.firstLine === 'number' ? indent.firstLine : 0;
                const isFirstLine: boolean = lineIdx === 0 && localStartLine === 0;

                // Calculate first-line offset: firstLine - hanging
                // This creates the "hanging" effect where first line starts further left
                const firstLineOffset: number = firstLine - hanging;

                if (isFirstLine) {
                  // First line: paddingLeft = left, textIndent = firstLine - hanging
                  if (leftIndent > 0) {
                    lineEl.style.paddingLeft = `${leftIndent}px`;
                  }
                  if (firstLineOffset !== 0) {
                    lineEl.style.textIndent = `${firstLineOffset}px`;
                  }
                } else {
                  // Body lines: paddingLeft = left + hanging (when hanging > 0)
                  // This indents body lines further right, making first line "hang out"
                  // Note: Negative hanging values are intentionally ignored for body lines,
                  // treating them as if hanging were 0 (body lines use only left indent)
                  if (hanging > 0) {
                    lineEl.style.paddingLeft = `${leftIndent + hanging}px`;
                  } else if (leftIndent > 0) {
                    lineEl.style.paddingLeft = `${leftIndent}px`;
                  }
                }

                // Right indent applies to all lines
                if (typeof indent.right === 'number' && indent.right > 0) {
                  lineEl.style.paddingRight = `${indent.right}px`;
                }
              }
            }
            paraWrapper.appendChild(lineEl);
          }

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
